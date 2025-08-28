from flask import Blueprint, request, jsonify
from svix import Webhook, WebhookVerificationError
import os
from dotenv import load_dotenv
import helper

load_dotenv()

def create_clerk_webhook_blueprint(manager):
    webhook_bp = Blueprint('clerk_webhook', __name__)
    signing_secret = os.getenv('CLERK_WEBHOOK_SIGNING_SECRET')

    @webhook_bp.route('/clerk/webhook', methods=['POST'])
    def handle_clerk_webhook():
        body = request.get_data()
        headers = request.headers

        try:
            wh = Webhook(signing_secret)
            evt = wh.verify(body, headers=headers)
        except WebhookVerificationError as e:
            return jsonify({"error": "Invalid signature"}), 400

        event_type = evt['type']
        data = evt['data']
        user_id = data.get('id')

        if event_type == 'user.deleted':
            print(f"Clerk user deleted: {user_id}")
            manager.delete_user(user_id)
        elif event_type == 'user.created':
            user_id = data.get('id')
            email_addresses = data.get('email_addresses', [])
            user_email = None
            for email_obj in email_addresses:
                if email_obj.get('verification', {}).get('status') == 'verified':
                    user_email = email_obj.get('email_address')
                    break
            if not user_email and email_addresses:
                user_email = email_addresses[0].get('email_address')
            
            # Get a username or fallback to first+last name
            user_name = data.get('username')
            if not user_name:
                first = data.get('first_name', '')
                last = data.get('last_name', '')
                user_name = (first + ' ' + last).strip() or None
            
            helper.register_clerk_user(user_id,user_name, user_email)

        return jsonify({"received": event_type}), 200

    return webhook_bp
