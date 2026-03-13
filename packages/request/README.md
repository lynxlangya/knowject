# @knowject/request

基于 Axios 的通用请求库，提供统一拦截器、错误封装、并发去重和下载辅助能力。

## 安装（workspace）

```bash
pnpm add @knowject/request --filter platform
```

## 快速使用

```ts
import {
  createHttpClient,
  unwrapApiData,
  type ApiEnvelope,
} from '@knowject/request';

export const client = createHttpClient({
  baseURL: '/api',
  timeout: 10000,
  dedupe: true,
  getToken: () => localStorage.getItem('knowject_token'),
  onUnauthorized: () => {
    window.location.href = '/login';
  },
});

const response = await client.get<ApiEnvelope<{ status: string }>>('/health');
const data = unwrapApiData(response.data);
```

## 错误处理

```ts
import { isApiError } from '@knowject/request';

try {
  await client.get('/health');
} catch (error) {
  if (isApiError(error)) {
    console.error(error.status, error.requestId, error.message);
  }
}
```

## 文件下载

```ts
import { downloadFile } from '@knowject/request';

const response = await client.get('/reports/export', { responseType: 'blob' });
downloadFile(response.data, 'report.xlsx');
```
