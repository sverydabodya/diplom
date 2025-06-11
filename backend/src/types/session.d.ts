import { SessionUser } from "./SessionUser";

declare module "express-session" {
	interface Session {
		user: SessionUser;
	}
}
