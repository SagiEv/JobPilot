import redis
import os

class RateLimiter:
    def __init__(self):
        # Fallback to localhost if not set in .env
        redis_host = os.environ.get("REDIS_HOST", "localhost")
        redis_port = int(os.environ.get("REDIS_PORT", 6379))
        # Simple redis client
        self.redis_client = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)
        
        # Hardcoded free tier limits (Loosened since we pace internally via graph delays)
        self.limits = {
            "gemini": {"rpm": 60}, 
            "groq": {"rpm": 60}
        }
        
    def is_limited(self, provider: str) -> bool:
        """Returns True if the provider is currently rate limited"""
        try:
            # Check for hard cooldown (from a 429)
            cooldown_key = f"rate_limit:cooldown:{provider}"
            if self.redis_client.exists(cooldown_key):
                return True
                
            # Check RPM sliding window
            rpm_key = f"rate_limit:rpm:{provider}"
            current_reqs = self.redis_client.get(rpm_key)
            
            limit = self.limits.get(provider, {}).get("rpm", 30)
            
            if current_reqs and int(current_reqs) >= limit:
                return True
                
            return False
        except redis.ConnectionError:
            # If Redis is down, fail open (allow request) to prevent complete outage
            print("Warning: Redis connection error in RateLimiter")
            return False
        
    def record_request(self, provider: str):
        """Record that a request was made, to track RPM"""
        try:
            rpm_key = f"rate_limit:rpm:{provider}"
            pipe = self.redis_client.pipeline()
            pipe.incr(rpm_key)
            pipe.execute()
            
            # Set expiry to 60s if it's a new key
            if self.redis_client.ttl(rpm_key) == -1:
                self.redis_client.expire(rpm_key, 60)
        except redis.ConnectionError:
            pass
        
    def set_cooldown(self, provider: str, seconds: int):
        """Set a hard cooldown for a provider (e.g. when receiving a 429)"""
        try:
            cooldown_key = f"rate_limit:cooldown:{provider}"
            self.redis_client.setex(cooldown_key, max(1, seconds), "1")
        except redis.ConnectionError:
            pass

    def get_alternative_provider(self, current_provider: str, available_providers: list) -> str:
        """Returns an alternative provider that is not rate limited"""
        for provider in available_providers:
            if provider != current_provider and not self.is_limited(provider):
                return provider
        return None

rate_limiter = RateLimiter()
