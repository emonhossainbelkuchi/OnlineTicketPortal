import { api } from '@/lib/api';
import type { BusOperator } from '@/lib/api';
import type {
  OperatorSetting,
  OperatorSettingCreateDto,
  OperatorSettingUpdateDto,
} from '@/types/operatorSetting';

// Real backend contract (OperatorSettingsController):
//   GET    api/OperatorSettings        [Admin only] (empty [] for non-Admin)
//   GET    api/OperatorSettings/{id}   [Admin only]
//   POST   api/OperatorSettings        [Admin only]
//   PUT    api/OperatorSettings/{id}   [Admin only] (RowVersion required)
//   DELETE api/OperatorSettings/{id}   [Admin only] -> 204 (soft delete)
// No caching, no localStorage — every call hits SQL server directly. Realtime = hook polling.
const BASE = 'api/OperatorSettings';

const operatorSettingService = {
  getAll: () => api.get<OperatorSetting[]>(BASE).then((r) => r.data),

  getById: (id: string) => api.get<OperatorSetting>(`${BASE}/${id}`).then((r) => r.data),

  create: (dto: OperatorSettingCreateDto) =>
    api.post<OperatorSetting>(BASE, dto).then((r) => r.data),

  update: (id: string, dto: OperatorSettingUpdateDto) =>
    api.put<OperatorSetting>(`${BASE}/${id}`, dto).then((r) => r.data),

  delete: (id: string) => api.delete(`${BASE}/${id}`),

  // dropdown source for Create/Edit's BusOperatorId picker
  getBusOperators: () => api.get<BusOperator[]>('api/BusOperators').then((r) => r.data),
};

export default operatorSettingService;
