// CommissionRule API service — thin wrapper over api/CommissionRules.
// Matches the project's actual lib/api.ts convention: plain axios + API_BASE_URL
// (no separate shared "axiosClient" instance exists in this repo).
import axios from 'axios';
import { API_BASE_URL } from '@/lib/api';
import {
  CommissionRule,
  CommissionRuleCreateDto,
  CommissionRuleUpdateDto,
} from '@/types/commissionRule.types';

const BASE_URL = `${API_BASE_URL}/api/CommissionRules`;

export const commissionRuleService = {
  getAll: async (): Promise<CommissionRule[]> => {
    const res = await axios.get<CommissionRule[]>(BASE_URL);
    return res.data;
  },

  getById: async (id: string): Promise<CommissionRule> => {
    const res = await axios.get<CommissionRule>(`${BASE_URL}/${id}`);
    return res.data;
  },

  create: async (dto: CommissionRuleCreateDto): Promise<CommissionRule> => {
    const res = await axios.post<CommissionRule>(BASE_URL, dto);
    return res.data;
  },

  update: async (id: string, dto: CommissionRuleUpdateDto): Promise<CommissionRule> => {
    const res = await axios.put<CommissionRule>(`${BASE_URL}/${id}`, dto);
    return res.data;
  },

  remove: async (id: string): Promise<void> => {
    await axios.delete(`${BASE_URL}/${id}`);
  },
};

export default commissionRuleService;