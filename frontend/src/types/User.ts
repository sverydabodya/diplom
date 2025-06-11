export type User = {
	id: string;
	name: string;
	email?: string;
	isOnline?: boolean;
	lastSeen?: Date;
	chats: string[];
};
