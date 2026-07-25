from rest_framework.permissions import SAFE_METHODS, BasePermission


class RoleWritePermission(BasePermission):
    """
    Reads: any authenticated user.
    Writes: admin/superuser always, plus roles in the view's `write_roles`.
    Deletes: admin/superuser always, plus roles in the view's `delete_roles`.
    """

    message = 'ليس لديك صلاحية لهذا الإجراء'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        if user.is_superuser or user.role == 'admin':
            return True
        if request.method == 'DELETE':
            return user.role in getattr(view, 'delete_roles', ())
        return user.role in getattr(view, 'write_roles', ('dentist', 'assistant', 'receptionist'))
