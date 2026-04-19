from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver
from django.core.cache import cache
from .models import User

def clear_user_permission_cache(user_id):
    """
    Clears all auth/permission related cache keys for a specific user.
    """
    keys = [
        f"user_is_admin_{user_id}",
        f"user_is_manager_or_admin_{user_id}",
        f"user_can_manage_users_{user_id}",
    ]
    for key in keys:
        cache.delete(key)

@receiver(post_save, sender=User)
def user_post_save(sender, instance, **kwargs):
    """
    Clear cache when user object is saved (e.g. is_superuser changed).
    """
    clear_user_permission_cache(instance.id)

@receiver(m2m_changed, sender=User.groups.through)
def user_groups_changed(sender, instance, action, **kwargs):
    """
    Clear cache when user's groups are modified.
    """
    if action in ["post_add", "post_remove", "post_clear"]:
        clear_user_permission_cache(instance.id)
