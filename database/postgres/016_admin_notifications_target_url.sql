ALTER TABLE "AdminNotifications"
ADD COLUMN IF NOT EXISTS "TargetUrl" varchar(500) NOT NULL DEFAULT '/admin';
