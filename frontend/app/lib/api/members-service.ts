import { apiClient } from "@/app/lib/api-client";
import API_ENDPOINTS, { buildUrl } from "@/app/lib/api/endpoints";
import type {
  Member,
  MemberQueryParams,
  CreateMemberRequest,
  UpdateMemberRequest,
  DeactivateMemberResponse,
  ActivateMemberResponse,
  Transaction,
  BookCopy,
  PaginatedResponse,
} from "@/app/types/library";

/**
 * Get list of members with optional query parameters (Librarian only)
 */
export const getMembers = async (params?: MemberQueryParams): Promise<Member[]> => {
  const response = await apiClient.get<PaginatedResponse<Member>>(
    buildUrl(API_ENDPOINTS.MEMBERS.LIST, params)
  );
  return response.results;
};

/**
 * Get paginated list of members with optional query parameters (Librarian only)
 */
export interface PaginatedMemberQueryParams extends MemberQueryParams {
  page?: number;
  page_size?: number;
}

export const getMembersPaginated = async (
  params?: PaginatedMemberQueryParams
): Promise<PaginatedResponse<Member>> => {
  return apiClient.get<PaginatedResponse<Member>>(
    buildUrl(API_ENDPOINTS.MEMBERS.LIST, params)
  );
};

/**
 * Get a single member by ID (Librarian only)
 */
export const getMemberById = async (id: number): Promise<Member> => {
  return apiClient.get<Member>(API_ENDPOINTS.MEMBERS.DETAIL(id));
};

/**
 * Create a new member (Librarian only)
 */
export const createMember = async (data: CreateMemberRequest): Promise<Member> => {
  return apiClient.post<Member>(API_ENDPOINTS.MEMBERS.LIST, data);
};

/**
 * Update an existing member (Librarian only)
 */
export const updateMember = async (
  id: number,
  data: UpdateMemberRequest
): Promise<Member> => {
  return apiClient.patch<Member>(API_ENDPOINTS.MEMBERS.DETAIL(id), data);
};

/**
 * Deactivate a member (Librarian only)
 * Note: Will fail if member has active borrows
 */
export const deactivateMember = async (
  id: number
): Promise<DeactivateMemberResponse> => {
  return apiClient.post<DeactivateMemberResponse>(
    API_ENDPOINTS.MEMBERS.DEACTIVATE(id)
  );
};

/**
 * Activate a member (Librarian only)
 */
export const activateMember = async (
  id: number
): Promise<ActivateMemberResponse> => {
  return apiClient.post<ActivateMemberResponse>(API_ENDPOINTS.MEMBERS.ACTIVATE(id));
};

/**
 * Get a member's borrowing history (Librarian only)
 */
export const getMemberHistory = async (id: number): Promise<Transaction[]> => {
  const response = await apiClient.get<PaginatedResponse<Transaction>>(
    buildUrl(API_ENDPOINTS.MEMBERS.BORROWING_HISTORY, { member_id: id })
  );
  return response.results;
};

/**
 * Get a member's active borrows (Librarian only)
 */
export const getMemberActiveBorrows = async (id: number): Promise<BookCopy[]> => {
  return apiClient.get<BookCopy[]>(
    buildUrl(API_ENDPOINTS.MEMBERS.ACTIVE_BORROWS, { member_id: id })
  );
};

/**
 * Get own profile (Member only)
 */
export const getMyProfile = async (): Promise<Member> => {
  return apiClient.get<Member>(API_ENDPOINTS.MEMBERS.ME);
};

/**
 * Get own borrowing history (Member only)
 */
export const getMyBorrowingHistory = async (): Promise<Transaction[]> => {
  const response = await apiClient.get<PaginatedResponse<Transaction>>(
    API_ENDPOINTS.MEMBERS.BORROWING_HISTORY
  );
  return response.results;
};

/**
 * Get paginated own borrowing history (Member only)
 */
export interface PaginatedHistoryQueryParams {
  page?: number;
  page_size?: number;
  [key: string]: string | number | boolean | undefined;
}

export const getMyBorrowingHistoryPaginated = async (
  params?: PaginatedHistoryQueryParams
): Promise<PaginatedResponse<Transaction>> => {
  return apiClient.get<PaginatedResponse<Transaction>>(
    buildUrl(API_ENDPOINTS.MEMBERS.BORROWING_HISTORY, params)
  );
};

/**
 * Get own active borrows (Member only)
 */
export const getMyActiveBorrows = async (): Promise<BookCopy[]> => {
  return apiClient.get<BookCopy[]>(API_ENDPOINTS.MEMBERS.ACTIVE_BORROWS);
};
