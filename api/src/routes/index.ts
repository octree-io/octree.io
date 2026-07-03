import { Router } from "express";
import { problemsRouter } from "./problems.js";
import { roomsRouter } from "./rooms.js";
import { usersRouter } from "./users.js";
import { submissionsRouter } from "./submissions.js";

export const apiRouter = Router();

apiRouter.use("/problems", problemsRouter);
apiRouter.use("/rooms", roomsRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/submissions", submissionsRouter);
