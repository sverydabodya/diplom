export interface Message {
	id: string;
	content: string;
	sender: {
		id: string;
		name: string;
	};
	isRead: boolean;
	readAt?: Date;
	createdAt: Date;
	// Поля для відповідей на повідомлення
	replyToId?: string;
	replyTo?: {
		id: string;
		content: string;
		sender: {
			id: string;
			name: string;
		};
		createdAt: Date;
	};
}

export interface Chat {
	id: string;
	name?: string;
	createdBy?: string;
	participants: string[];
	users: any[];
	messages?: Message[];
	lastMessage?: Message;
	createdAt: Date;
	updatedAt: Date;
}
