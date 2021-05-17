# Grades

## Example
An example is deployed at https://grades-eight.vercel.app/
The passwords are in passwords.txt
Please do not destroy the site before I get a grade. (I made a db backup just in case)

## Deploying
First `npm install`

Set the environment variable `MONGO_URI` to the mongodb connect string.

Create the database indexes:
```bash
cd bin
npx tsc
node dist/bin/init_db.js
```

Create the first admin:
```bash
cd bin
npx tsc
node dist/bin/new_admin.js
```

Then use `npm run build` and `npm run dev` as you would for a Next.js project.

## Screenshots
![Student Overview](/screenshots/student_overview.png?raw=true)

What a student sees when they log in.

![Login](/screenshots/login.png?raw=true)

What a student sees before they log in.

![Student Class](/screenshots/student_example.png?raw=true)

A student viewing their class.

![Professor Overview](/screenshots/professor_class.png?raw=true)

A professor checking on their students.

![Professor Assignments](/screenshots/class_edit.png?raw=true)

A professor looking at their assignments.

![Professor Grades](/screenshots/assignment_edit.png?raw=true)

A professor about to disappoint a lot of people.

![New User](/screenshots/new_user.png?raw=true)
Where users come from.
