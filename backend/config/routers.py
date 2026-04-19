class LoggerRouter:
    """
    A router to control all database operations on models in the
    logging and audit applications.
    """
    route_app_labels = {'logs', 'audit'}

    def db_for_read(self, model, **hints):
        """
        Attempts to read logging models go to logger db.
        """
        if model._meta.app_label in self.route_app_labels:
            return 'logger'
        return 'default'

    def db_for_write(self, model, **hints):
        """
        Attempts to write logging models go to logger db.
        """
        if model._meta.app_label in self.route_app_labels:
            return 'logger'
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        """
        Allow relations if a model in the logging app is involved.
        """
        if (
            obj1._meta.app_label in self.route_app_labels or
            obj2._meta.app_label in self.route_app_labels
        ):
           return True
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Make sure the logging app only appears in the 'logger' database.
        """
        if app_label in self.route_app_labels:
            return db == 'logger'
        return db == 'default'
