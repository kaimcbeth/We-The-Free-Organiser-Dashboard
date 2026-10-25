-- (Applied by hand.) Photo consent checked: about 2 minutes.
update task_kinds set estimate_minutes = 2, estimate_max_minutes = null where kind = 'promo_photo_consent';
