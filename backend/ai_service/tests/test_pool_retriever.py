"""
Pool Retriever (RAG) Tests.
Tests semantic retrieval of projects and skills using embeddings.
Uses mocked model — no torch/sentence-transformers needed at test time.
"""
import pytest
import numpy as np
from unittest.mock import patch, MagicMock


class TestPoolRetriever:
    def _make_state(self, job_desc, projects, skills):
        return {
            "job_description_raw": job_desc,
            "projects_pool": projects,
            "skills_pool": skills,
        }

    def _generate_projects(self, n):
        names = [
            "React Dashboard", "ML Pipeline", "DevOps Toolkit",
            "Chat App", "E-Commerce", "Blog Platform",
            "Analytics Engine", "Auth Service", "CI/CD Setup",
            "Mobile App", "Data Lake", "API Gateway",
        ]
        return [
            {
                "name": names[i % len(names)],
                "title": names[i % len(names)],
                "description": f"Project {i} description",
                "tech_stack": f"Tech{i}",
            }
            for i in range(n)
        ]

    def _generate_skills(self, n):
        return [
            {"name": f"Skill{i}", "category": f"Cat{i % 5}"}
            for i in range(n)
        ]

    def _make_mock_model(self):
        """Create a mock SentenceTransformer model that uses numpy arrays."""
        mock_model = MagicMock()

        def _encode(text, convert_to_tensor=False):
            if isinstance(text, str):
                return np.random.randn(384).astype(np.float32)
            return np.random.randn(len(text), 384).astype(np.float32)

        mock_model.encode.side_effect = _encode
        return mock_model

    def _make_mock_util(self):
        """Create a mock util with cos_sim that uses numpy."""
        mock_util = MagicMock()
        def cos_sim(a, b):
            if len(a.shape) == 1:
                a = a.reshape(1, -1)
            if len(b.shape) == 1:
                b = b.reshape(1, -1)
            
            # Avoid division by zero
            a_norm_val = np.linalg.norm(a, axis=1, keepdims=True)
            b_norm_val = np.linalg.norm(b, axis=1, keepdims=True)
            a_norm = a / np.where(a_norm_val == 0, 1, a_norm_val)
            b_norm = b / np.where(b_norm_val == 0, 1, b_norm_val)
            return np.dot(a_norm, b_norm.T)
        
        mock_util.cos_sim.side_effect = cos_sim
        return mock_util

    @patch("cv_tailor.agents.pool_retriever.model")
    def test_returns_top5_projects(self, mock_model_ref):
        """Given 10 projects, returns exactly 5."""
        mock_m = self._make_mock_model()
        mock_u = self._make_mock_util()
        mock_model_ref.__bool__ = lambda self: True
        # We need to patch at the module level so the function sees our mock
        with patch("cv_tailor.agents.pool_retriever.model", mock_m), \
             patch("cv_tailor.agents.pool_retriever.util", mock_u):
            from cv_tailor.agents.pool_retriever import pool_retriever_node
            state = self._make_state(
                "React developer needed",
                self._generate_projects(10),
                [],
            )
            result = pool_retriever_node(state, {}, "groq", None)
        assert len(result["retrieved_projects"]) == 5

    @patch("cv_tailor.agents.pool_retriever.model")
    def test_returns_top20_skills(self, mock_model_ref):
        """Given 30 skills, returns exactly 20."""
        mock_m = self._make_mock_model()
        mock_u = self._make_mock_util()
        with patch("cv_tailor.agents.pool_retriever.model", mock_m), \
             patch("cv_tailor.agents.pool_retriever.util", mock_u):
            from cv_tailor.agents.pool_retriever import pool_retriever_node
            state = self._make_state(
                "Python developer needed",
                [],
                self._generate_skills(30),
            )
            result = pool_retriever_node(state, {}, "groq", None)
        assert len(result["retrieved_skills"]) == 20

    def test_fallback_when_model_is_none(self):
        """When model=None, returns first 10 projects and 30 skills."""
        with patch("cv_tailor.agents.pool_retriever.model", None):
            from cv_tailor.agents.pool_retriever import pool_retriever_node
            projects = self._generate_projects(15)
            skills = self._generate_skills(40)
            state = self._make_state("Any JD", projects, skills)
            result = pool_retriever_node(state, {}, "groq", None)
        assert len(result["retrieved_projects"]) == 10
        assert len(result["retrieved_skills"]) == 30

    def test_empty_job_description(self):
        """Empty JD → returns capped slices without crash."""
        with patch("cv_tailor.agents.pool_retriever.model", MagicMock()):
            from cv_tailor.agents.pool_retriever import pool_retriever_node
            projects = self._generate_projects(8)
            skills = self._generate_skills(25)
            state = self._make_state("", projects, skills)
            result = pool_retriever_node(state, {}, "groq", None)
        assert len(result["retrieved_projects"]) <= 5
        assert len(result["retrieved_skills"]) <= 20

    @patch("cv_tailor.agents.pool_retriever.model")
    def test_relevant_items_ranked_higher(self, mock_model_ref):
        """A 'React developer' JD should rank a React project above a DevOps project."""
        mock_m = MagicMock()

        # Create controlled embeddings using numpy
        job_emb = np.zeros(384, dtype=np.float32)
        job_emb[0] = 1.0  # React direction

        react_emb = np.zeros(384, dtype=np.float32)
        react_emb[0] = 0.9
        react_emb[1] = 0.1  # Close to job

        devops_emb = np.zeros(384, dtype=np.float32)
        devops_emb[2] = 1.0  # Orthogonal

        def _encode(text, convert_to_tensor=False):
            if isinstance(text, str):
                return job_emb
            return np.stack([react_emb, devops_emb])

        mock_m.encode.side_effect = _encode
        mock_u = self._make_mock_util()

        with patch("cv_tailor.agents.pool_retriever.model", mock_m), \
             patch("cv_tailor.agents.pool_retriever.util", mock_u):
            from cv_tailor.agents.pool_retriever import pool_retriever_node
            projects = [
                {"name": "React App", "title": "React App", "description": "React frontend", "tech_stack": "React"},
                {"name": "DevOps Setup", "title": "DevOps Setup", "description": "CI/CD pipeline", "tech_stack": "Docker"},
            ]
            state = self._make_state("React developer needed", projects, [])
            result = pool_retriever_node(state, {}, "groq", None)

        # React project should be first (higher similarity)
        assert result["retrieved_projects"][0]["name"] == "React App"
