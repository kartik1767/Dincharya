# Dincharya – bug fixes and new features

## Bugs fixed

**Admins could see each other's tasks.** Every task query ignored `createdBy`. Admins now only see, edit, delete, report on, and get dashboard stats for tasks *they* created. Members still only see tasks assigned to them. The rules live in `backend/utils/taskAccess.js`.

**Other access-control holes**
- `GET /api/tasks/:id` returned any task to any logged-in user. Now owner admin or assignee only (others get 404).
- `PUT /api/tasks/:id` (edit title, assignees, checklist…) had no admin check, so a member could edit any task. Now owner admin only.
- The checklist endpoint replaced the whole checklist, so a member could rewrite item text. Members can now only tick/untick.
- The frontend `PrivateRoute` ignored `allowedRoles`, and user routes were marked admin-only. Members could open admin pages and vice versa. Fixed.
- `GET /api/users/:id` is now admin-or-self.

**Reports**
- Scoped to the downloading admin's tasks. The users report lists members only, not admins.
- `toast` was used but never imported in ManageTasks/ManageUsers, so a failed download threw instead of showing an error.
- The workbook is now built in memory before sending, so errors return JSON instead of a broken file. The frontend reads that error and shows it.
- Files get dated names, styled headers, and new columns: progress, checklist done, started/completed dates, overdue, completion rate.
- Dates are formatted in the downloader's time zone.

**Other fixes**
- Wrong-password login returned 401, and the axios interceptor reloaded the page to `/login`. That meant "Invalid email or password" was never shown.
- Editing a task and opening "Add Members" showed nobody selected. Pressing DONE then unassigned everyone.
- Due dates were saved as UTC midnight, so in US time zones a task due 25 Oct showed as 24 Oct. They're now saved as the end of the selected local day.
- The member dashboard's "See All" went to `/admin/tasks`.
- Profile-image upload failed in production. `npm start` runs from the repo root, so multer's relative `uploads/` folder didn't exist. Also added `trust proxy` so image URLs are `https` on Render, plus a 2 MB limit and JSON errors.
- Invalid task ids, validation errors, and unknown `/api` routes now return 400/404 JSON instead of 500 or `index.html`.
- `npm run dev` had no proxy to the backend, so every API call failed in dev. Added a Vite proxy to `localhost:5000`.
- Other small fixes: the SelectDropdown chevron typo, a deleted-user token crashing `protect`, the admin page titled "My Tasks", and the password "min 8 characters" rule not being enforced.

## New: task progress tracking
- A member opens a task and clicks **Start Working** (Pending → In Progress). Then **Mark as Completed**, which asks for confirmation if checklist items remain. A completed task can be **Reopened**. A task can go back to Pending while nothing is ticked.
- Ticking checklist items updates the progress %. All ticked auto-completes the task. Unticking a completed task reopens it. Unticking everything keeps it In Progress once started.
- `startedAt` / `completedAt` timestamps are shown on the task page and in the report.
- **Activity timeline + progress updates.** Every status change, checklist tick, and edit is logged. Members and the admin can post notes such as "blocked on API keys" (`POST /api/tasks/:id/comments`).
- Admins now open tasks on a details page (`/admin/task-details/:id`) to see progress and activity, with an **Edit Task** button.

## Other additions
- Overdue badges on task cards and the task page, plus an Overdue count on both dashboards and on member cards.
- Avatar initials fallback for users without a profile photo, instead of broken images.
- Time-based greeting, clickable rows in "Recent Tasks", progress/due-date columns, and empty states.
- Assignees are validated as existing members.

## Notes
- Tasks created before this change keep working. They just start with an empty activity log.
- Render's disk is wiped on every deploy, so uploaded profile photos in `backend/uploads` will disappear. Moving to Cloudinary or S3 would fix that.
- `package.json` in both `backend` and `frontend/Task-Manager` lists `"dincharya": "file:.."` as a dependency, which is the project depending on itself. It looks accidental and is safe to remove.
