// OperatorSettlement API service — matches OperatorSettlementsController exactly:
// GET (list, optional busOperatorId filter), GET/{id} (detail w/ items), POST /generate,
// POST /{id}/approve. No generic Create/Update/Delete — none exist on the backend.
import axios from 'axios';
import { API_BASE_URL } from '@/lib/api';
import {
  OperatorSettlement,
  OperatorSettlementDetail,
  SettlementGenerateDto,
  SettlementApproveDto,
} from '@/types/operatorSettlement.types';

const BASE_URL = `${API_BASE_URL}/api/OperatorSettlements`;

export const operatorSettlementService = {
  getAll: async (busOperatorId?: string): Promise<OperatorSettlement[]> => {
    const res = await axios.get<OperatorSettlement[]>(BASE_URL, {
      params: busOperatorId ? { busOperatorId } : undefined,
    });
    return res.data;
  },

  getById: async (id: string): Promise<OperatorSettlementDetail> => {
    const res = await axios.get<OperatorSettlementDetail>(`${BASE_URL}/${id}`);
    return res.data;
  },

  generate: async (dto: SettlementGenerateDto): Promise<OperatorSettlementDetail> => {
    const res = await axios.post<OperatorSettlementDetail>(`${BASE_URL}/generate`, dto);
    return res.data;
  },

  approve: async (id: string, dto: SettlementApproveDto): Promise<void> => {
    await axios.post(`${BASE_URL}/${id}/approve`, dto);
  },
};

export default operatorSettlementService;
