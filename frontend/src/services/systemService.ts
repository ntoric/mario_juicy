import { fetcher } from '@/lib/api';

export interface SupportSettings {
    id: number;
    email: string;
    phone: string;
    updated_at: string;
}

export const systemService = {
    getSupportSettings: async (): Promise<SupportSettings> => {
        return await fetcher('/support/');
    }
};
