"""
性能优化配置
"""
from typing import Dict, Any

# 缓存配置
CACHE_CONFIG = {
    "default_ttl": 3600,  # 默认缓存时间（秒）
    "long_ttl": 86400,     # 长缓存时间（秒）
    "short_ttl": 600,      # 短缓存时间（秒）
    "cache_keys": {
        "knowledge_list": "knowledge:list:{filters}",
        "knowledge_detail": "knowledge:detail:{id}",
        "category_list": "category:list",
        "tag_list": "tag:list",
        "supplier_list": "supplier:list:{filters}",
        "survey_list": "survey:list:{filters}"
    }
}

# 数据库索引配置
DATABASE_INDEXES = {
    "users": [
        "idx_users_email",
        "idx_users_username",
        "idx_users_role"
    ],
    "suppliers": [
        "idx_suppliers_name",
        "idx_suppliers_status",
        "idx_suppliers_industry"
    ],
    "surveys": [
        "idx_surveys_status",
        "idx_surveys_supplier_id",
        "idx_surveys_created_at"
    ],
    "knowledge_bases": [
        "idx_knowledge_bases_title",
        "idx_knowledge_bases_status",
        "idx_knowledge_bases_type",
        "idx_knowledge_bases_category_id",
        "idx_knowledge_bases_created_at"
    ],
    "knowledge_categories": [
        "idx_knowledge_categories_name",
        "idx_knowledge_categories_parent_id"
    ],
    "knowledge_tags": [
        "idx_knowledge_tags_name"
    ]
}

# API性能配置
API_CONFIG = {
    "pagination": {
        "default_page_size": 20,
        "max_page_size": 100,
        "default_page": 1
    },
    "rate_limiting": {
        "enabled": True,
        "max_requests_per_minute": 60
    },
    "response_compression": True,
    "gzip_compression": True
}

# 性能监控配置
PERFORMANCE_MONITORING = {
    "enabled": True,
    "slow_request_threshold": 0.5,  # 慢请求阈值（秒）
    "log_slow_requests": True,
    "metrics_collection": True
}
