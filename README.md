# octree.io
[![MIT License](https://img.shields.io/dub/l/vibe-d.svg)](https://github.com/octree-io/octree.io/blob/main/LICENSE)

`octree.io` is a platform where you can solve algorithmic interview problems socially.

![Landing](https://github.com/user-attachments/assets/53dc2955-7611-410f-a71e-26b3d24d803a)


## Features
- Account creation with the ability to change your profile picture and username
- Lobby which is a Slack-like chat room
- Game rooms which consist of algorithmic problems that have a timer and are cycled and also contain a chatbox
- Trivia rooms which are a way to quiz yourself for whichever types of questions you choose and get graded at the end by GenAI. Was originally built for studying interview trivia problems such as OS concepts, databases, concurrency, etc.

## High Level Overview

![octree io design](https://github.com/user-attachments/assets/0d00f1c1-f2ff-49eb-9c09-e774a0caeefb)

Components:
- Website: This package contains all of the React frontend code used to run the website.
- Backend API: [octree.io-backend](https://github.com/octree-io/octree.io-backend) is the backend that uses Express and socket.io to handle requests.
- Worker: [octree.io-worker](https://github.com/octree-io/octree.io-worker) is the worker service that compiles and executes the code submissions.
- Postgres: Main database used for storing user info, room data, chat messages, etc. The database schema can be found at tables.sql
- MongoDB: Used to store the problem documents which contain metadata like problem name, ID, starter code, test cases and so on
- RabbitMQ: The messaging queue that's used to relay messages between the backend and the workers.

How it works:
- User submits code to be compiled and executed.
- Frontend sends the code to socket.io room.
- Backend receives the code request and enqueues a message to RabbitMQ.
- Worker picks up message from RabbitMQ and starts processing work.
- Most languages use the [Compiler Explorer API](https://github.com/compiler-explorer/compiler-explorer/blob/main/docs/API.md) to compile and execute code except for JavaScript and TypeScript. A dummy npm package is created for both JS & TS and the worker writes the code to the package and executes it with wasmtime.
  - TypeScript transpiles to JavaScript with `tsc` first before being executed.
- Once the worker completes the execution, the stdout, stderr and execution time are sent to a compilation responses queue in RabbitMQ.
- Backend picks up message from RabbitMQ and relays the results back to the user who requested the code compilation.

## Bug Reports

Feel free to open up an issue if you see any bugs in the platform. Contributions are also always more than welcome. :)
