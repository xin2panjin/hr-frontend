import request from '@/apis/request'

export const RECRUITER_ROLE_CODE = 'ROLE_HR_RECRUITER'
export const DEPARTMENT_CODE_PATTERN = /^DEPT-(?:[A-Z0-9]{2,12}-)*[A-Z0-9]{2,12}$/

export interface IamDepartment { id: string; code: string; name: string; description?: string | null; status: 'ACTIVE' | 'ARCHIVED'; parent_id: string | null }
export interface IamDepartmentTreeNode extends IamDepartment { children: IamDepartmentTreeNode[] }
export interface DepartmentSummary { direct_user_count: number; child_department_count: number; open_position_count: number; active_role_scope_count: number }
export interface IamUser { id: string; username: string; email: string; realname: string; phone_number: string | null; department_id: string | null; department: IamDepartment | null; status: string; authz_version: number; role_codes: string[] }
export interface Principal { user: IamUser; roles: { code: string; name: string; department_ids: string[] }[]; permissions: string[] }
export interface IamRole { id: string; code: string; name: string; description: string | null; is_system: boolean; permissions: string[] }
export interface RolePermissionItem { id: string; name: string; description: string | null; checked: boolean }
export interface RolePermissionModule { name: string; permissions: RolePermissionItem[] }
export interface RolePermissionTree { role_id: string; role_name: string; modules: RolePermissionModule[] }
export interface UserRole { id: string; role_code: string; department_ids: string[]; expires_at: string | null }
export interface AuthSession { id: string; created_at: string; last_seen_at: string | null; expires_at: string; revoked_at: string | null; revoke_reason: string | null; is_current: boolean }
export interface AuditLog { id: string; actor_id: string | null; action: string; target_type: string; target_id: string | null; created_at: string }

export const getPrincipal = () => request.get<Principal>('/iam/me')
export const getIamUsers = (params: { page: number; size: number; department_id?: string; include_descendants?: boolean; role_code?: string; keyword?: string; status?: string }) => request.get<{ users: IamUser[]; total: number }>('/iam/users', params)
export const getIamDepartments = () => request.get<IamDepartment[]>('/iam/departments')
export const getDepartmentTree = () => request.get<IamDepartmentTreeNode[]>('/iam/departments/tree')
export const getDepartmentSummary = (id: string) => request.get<DepartmentSummary>(`/iam/departments/${id}/summary`)
export const getIamRoles = () => request.get<IamRole[]>('/iam/roles')
export const getRolePermissions = (id: string) => request.get<RolePermissionTree>(`/iam/roles/${id}/permissions`)
export const updateRolePermissions = (id: string, data: { permission_ids: string[]; reason: string }) => request.put<RolePermissionTree>(`/iam/roles/${id}/permissions`, data)
export const createIamInvitation = (data: { username: string; email: string; department_id: string; role_code: string; department_scope_ids: string[]; reason?: string }) => request.post('/iam/invitations', data)
export const grantRole = (userId: string, data: { role_code: string; department_ids: string[]; reason?: string }) => request.post(`/iam/users/${userId}/roles`, data)
export const getUserRoles = (userId: string) => request.get<UserRole[]>(`/iam/users/${userId}/roles`)
export const revokeRole = (id: string, reason: string) => request.delete(`/iam/user-roles/${id}`, { data: { reason } })
export const replaceRoleScopes = (id: string, department_ids: string[]) => request.put(`/iam/user-roles/${id}/scopes/departments`, { department_ids })
export const updateUserStatus = (userId: string, status: string) => request.patch(`/iam/users/${userId}/status`, { status })
export const resetUserPassword = (userId: string, newPassword: string) => request.post(`/iam/users/${userId}/reset-password`, { new_password: newPassword })
export const changeMyPassword = (data: { current_password: string; new_password: string }) => request.post('/iam/me/change-password', data)
export const createDepartment = (data: { code: string; name: string; description?: string; parent_id?: string | null }) => request.post('/iam/departments', data)
export const updateDepartment = (id: string, data: { code?: string; name?: string; description?: string; parent_id?: string | null }) => request.patch(`/iam/departments/${id}`, data)
export const archiveDepartment = (id: string) => request.delete(`/iam/departments/${id}`)
export const getDepartmentDependencies = (id: string) => request.get<{ active_users: number; open_positions: number; active_role_scopes: number; active_child_departments: number; legacy_managed_department_bindings: number; pending_invitations: number }>(`/iam/departments/${id}/dependencies`)
export const updateUserProfile = (id: string, data: { realname?: string; phone_number?: string | null; department_id?: string }) => request.patch(`/iam/users/${id}`, data)
export const getMySessions = () => request.get<AuthSession[]>('/iam/me/sessions')
export const revokeMySession = (id: string) => request.delete(`/iam/me/sessions/${id}`)
export const getAuditLogs = (params: {
  page: number
  size: number
  actor_id?: string
  action?: string
  target_type?: string
  target_id?: string
  started_at?: string
  ended_at?: string
}) => request.get<{ items: AuditLog[]; total: number }>('/iam/audit-logs', params)
