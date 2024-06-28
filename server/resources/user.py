"""
User class 
"""

from datetime import datetime


class User:
    def __init__(self):
        self.users = []
        self.users.append(
            {
                "email": "example@gmail.com",
                "magic_link": "123456",
                "available_tokens": 100000,
            }
        )

    def add_user(self, email, magic_link, available_tokens):
        self.users.append(
            {
                "email": email,
                "magic_link": magic_link,
                "magic_link_created": datetime.now(),
                "available_tokens": available_tokens,
            }
        )

    def find_by_email(self, email):
        for user in self.users:
            if user["email"] == email:
                return user
        return None

    def delete_user(self, email):
        user = self.find_by_email(email)
        if user:
            self.users.remove(user)
            return True
        return False
