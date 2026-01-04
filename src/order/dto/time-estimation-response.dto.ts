export class TimeEstimationResponseDto {
    estimatedMinutes: number;
    baseMinutes: number;
    queuePosition: number;
    currentQueueSize: number;
    explanation: string;
}
