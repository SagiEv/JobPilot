import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const NetworkGraph = ({ contacts }) => {
    const svgRef = useRef();
    const wrapperRef = useRef();

    useEffect(() => {
        if (!contacts || contacts.length === 0) return;

        const width = wrapperRef.current.clientWidth || 800;
        const height = wrapperRef.current.clientHeight || 600;

        d3.select(svgRef.current).selectAll('*').remove();

        const nodesMap = new Map();
        
        // Add Me node
        nodesMap.set('Me', { id: 'Me', name: 'Me', group: 'me', radius: 40 });

        const links = [];

        // Pass 1: Add all known contacts
        contacts.forEach(contact => {
            const contactId = contact.id || contact.name;
            if (!nodesMap.has(contactId)) {
                nodesMap.set(contactId, { id: contactId, name: contact.name, group: contact.relation, radius: 25 });
            }
        });

        // Pass 2: Establish links and identify existing connectors
        contacts.forEach(contact => {
            const contactId = contact.id || contact.name;

            if (contact.connected_by) {
                const connectorName = contact.connected_by.trim();
                let connectorId = connectorName;

                // Match existing contact by name (case-insensitive) to avoid duplicates
                const existingContact = contacts.find(c => c.name && c.name.toLowerCase() === connectorName.toLowerCase());
                if (existingContact) {
                    connectorId = existingContact.id || existingContact.name;
                }

                if (!nodesMap.has(connectorId)) {
                    // Create an intermediary node for the connector if it doesn't exist
                    nodesMap.set(connectorId, { id: connectorId, name: connectorName, group: 'Connector', radius: 20 });
                    links.push({ source: 'Me', target: connectorId });
                }
                links.push({ source: connectorId, target: contactId });
            } else {
                links.push({ source: 'Me', target: contactId });
            }
        });

        const nodes = Array.from(nodesMap.values());

        const svg = d3.select(svgRef.current)
            .attr("width", width)
            .attr("height", height)
            .style("background", "var(--bg-elevated, #ffffff)")
            .style("border-radius", "16px")
            .style("box-shadow", "0 8px 24px rgba(0,0,0,0.06)")
            .style("border", "1px solid var(--border, #eaeaea)")
            .style("overflow", "hidden");

        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });

        svg.call(zoom);

        const g = svg.append("g");

        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(150))
            .force("charge", d3.forceManyBody().strength(-400))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collide", d3.forceCollide().radius(d => d.radius + 15));

        // Create gradient definitions
        const defs = svg.append("defs");
        
        // Node gradient
        const createGradient = (id, color1, color2) => {
            const gradient = defs.append("linearGradient")
                .attr("id", id)
                .attr("x1", "0%")
                .attr("y1", "0%")
                .attr("x2", "100%")
                .attr("y2", "100%");
            gradient.append("stop").attr("offset", "0%").attr("stop-color", color1);
            gradient.append("stop").attr("offset", "100%").attr("stop-color", color2);
        };

        createGradient("me-grad", "#ff4d4f", "#ff7875");
        createGradient("colleague-grad", "#1890ff", "#69c0ff");
        createGradient("friend-grad", "#52c41a", "#95de64");
        createGradient("recruiter-grad", "#722ed1", "#b37feb");
        createGradient("connector-grad", "#fa8c16", "#ffd591");
        createGradient("default-grad", "#d9d9d9", "#f5f5f5");

        const getGradient = (group) => {
            if (group === 'me') return "url(#me-grad)";
            if (group === 'Colleague') return "url(#colleague-grad)";
            if (group === 'Friend') return "url(#friend-grad)";
            if (group === 'Recruiter') return "url(#recruiter-grad)";
            if (group === 'Connector') return "url(#connector-grad)";
            return "url(#default-grad)";
        };

        const link = g.append("g")
            .attr("stroke", "var(--border, #eaeaea)")
            .attr("stroke-opacity", 0.8)
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke-width", 2);

        const node = g.append("g")
            .attr("stroke", "#fff")
            .attr("stroke-width", 2)
            .selectAll("g")
            .data(nodes)
            .join("g")
            .call(drag(simulation))
            .style("cursor", "pointer")
            .on("mouseover", function() { d3.select(this).select("circle").attr("stroke", "#1890ff").attr("stroke-width", 3); })
            .on("mouseout", function() { d3.select(this).select("circle").attr("stroke", "#fff").attr("stroke-width", 2); });

        node.append("circle")
            .attr("r", d => d.radius)
            .attr("fill", d => getGradient(d.group))
            .style("filter", "drop-shadow(0px 4px 6px rgba(0,0,0,0.1))");

        node.append("text")
            .text(d => d.name || d.id)
            .attr("x", 0)
            .attr("y", d => d.radius + 18)
            .attr("text-anchor", "middle")
            .style("fill", "var(--t1, #333)")
            .style("font-size", "13px")
            .style("font-weight", "500")
            .style("pointer-events", "none")
            .attr("stroke", "none");

        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("transform", d => `translate(${d.x},${d.y})`);
        });

        function drag(simulation) {
            function dragstarted(event) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                event.subject.fx = event.subject.x;
                event.subject.fy = event.subject.y;
            }
            function dragged(event) {
                event.subject.fx = event.x;
                event.subject.fy = event.y;
            }
            function dragended(event) {
                if (!event.active) simulation.alphaTarget(0);
                event.subject.fx = null;
                event.subject.fy = null;
            }
            return d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended);
        }

    }, [contacts]);

    return (
        <div ref={wrapperRef} style={{ width: '100%', height: '600px', position: 'relative', marginTop: '20px' }}>
            <svg ref={svgRef} style={{ width: '100%', height: '100%' }}></svg>
        </div>
    );
};

export default NetworkGraph;
