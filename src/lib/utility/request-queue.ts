type QueueEntry = {
	message: {
		id: string;
	};
};

type PendingResponses = Record<string, unknown>;

export const shouldQueueRequest = (
	requestQueue: QueueEntry[],
	responders: PendingResponses,
	message: { id: string }
): boolean => {
	const requestId = message.id;
	if (!requestId) return true;

	const existingInQueue = requestQueue.some((item) => item.message.id === requestId);
	const existingPending = Boolean(responders[requestId]);

	return !existingInQueue && !existingPending;
};
