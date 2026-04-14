#!/usr/bin/env python3

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

print("Testing imports...")

try:
    from main import app
    print("✅ Main app imported successfully")
    
    from app.services.wechat_service import wechat_service
    print("✅ WeChat service imported successfully")
    
    from app.services.ai_gateway_service import ai_gateway_service
    print("✅ AI gateway service imported successfully")
    
    from app.models import (
        User, UserRole,
        Supplier, SupplierStatus, SupplierDocument,
        TeamConfirmation, ConfirmationStep,
        WeChatUser, WeChatMessage,
    )
    print("✅ All models imported successfully")
    
    print("\n🎉 All imports passed!")
    sys.exit(0)
    
except Exception as e:
    print(f"\n❌ Import failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
