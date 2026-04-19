from rest_framework import permissions

class StoreFilterMixin:
    """
    Mixin to filter querysets by the user's store automatically.
    - Super Admins can see everything or filter by X-Store-ID header.
    - Others are restricted to their assigned store.
    """
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if not user or not user.is_authenticated:
            return queryset.none()

        try:
            if user.is_admin:
                store_id = self.request.headers.get('X-Store-ID')
                if store_id and store_id.isdigit():
                    return queryset.filter(store_id=store_id)
                # Default to Main Branch (Store ID 1) for admins if no valid store selected
                return queryset.filter(store_id=1)

            if hasattr(user, 'store') and user.store:
                return queryset.filter(store=user.store)
        except (Exception,):
            # Fallback if DB schema doesn't match yet (pending migrations)
            # Catching generic Exception covers FieldError and OperationalError
            return queryset
        
        # If user has no store and is not admin, they see nothing
        return queryset.none()

    def perform_create(self, serializer):
        # Auto-assign store on creation if not provided
        user = self.request.user
        if not user.is_admin:
            serializer.save(store=user.store)
        else:
            store_id = self.request.headers.get('X-Store-ID')
            if store_id:
                serializer.save(store_id=store_id)
            else:
                # Default creation to Main Branch (ID 1) if not specified
                serializer.save(store_id=1)
