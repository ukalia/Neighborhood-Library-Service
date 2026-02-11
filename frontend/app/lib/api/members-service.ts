import { apiClient } from "@/app/lib/api-client";
import type {
  Member,
  MemberQueryParams,
  CreateMemberRequest,
  UpdateMemberRequest,
  DeactivateMemberResponse,
  ActivateMemberResponse,
  Transaction,
  BookCopy,
} from "@/app/types/library";

/**
 * Get list of members with optional query parameters (Librarian only)
 */
export const getMembers = async (params?: MemberQueryParams): Promise<Member[]> => {
  const queryString = params
    ? new URLSearchParams(
        Object.entries(params)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)])
      ).toString()
    : "";

  const endpoint = queryString ? `/api/members/?${queryString}` : "/api/members/";
  return apiClient.get<Member[]>(endpoint);
};

/**
 * Get a single member by ID (Librarian only)
 */
export const getMemberById = async (id: number): Promise<Member> => {
  return apiClient.get<Member>(`/api/members/${id}/`);
};

/**
 * Create a new member (Librarian only)
 */
export const createMember = async (data: CreateMemberRequest): Promise<Member> => {
  return apiClient.post<Member>("/api/members/", data);
};

/**
 * Update an existing member (Librarian only)
 */
export const updateMember = async (
  id: number,
  data: UpdateMemberRequest
): Promise<Member> => {
  return apiClient.patch<Member>(`/api/members/${id}/`, data);
};

/**
 * Deactivate a member (Librarian only)
 * Note: Will fail if member has active borrows
 */
export const deactivateMember = async (
  id: number
): Promise<DeactivateMemberResponse> => {
  return apiClient.post<DeactivateMemberResponse>(
    `/api/members/${id}/deactivate/`
  );
};

/**
 * Activate a member (Librarian only)
 */
export const activateMember = async (
  id: number
): Promise<ActivateMemberResponse> => {
  return apiClient.post<ActivateMemberResponse>(`/api/members/${id}/activate/`);
};

/**
 * Get a member's borrowing history (Librarian only)
 */
export const getMemberHistory = async (id: number): Promise<Transaction[]> => {
  return apiClient.get<Transaction[]>(`/api/members/borrowing_history/?member_id=${id}`);
};

/**
 * Get a member's active borrows (Librarian only)
 */
export const getMemberActiveBorrows = async (id: number): Promise<BookCopy[]> => {
  return apiClient.get<BookCopy[]>(`/api/members/active_borrows/?member_id=${id}`);
};

/**
 * Get own profile (Member only)
 */
export const getMyProfile = async (): Promise<Member> => {
  return apiClient.get<Member>("/api/members/me/");
};

/**
 * Get own borrowing history (Member only)
 */
export const getMyBorrowingHistory = async (): Promise<Transaction[]> => {
  return apiClient.get<Transaction[]>("/api/members/borrowing_history/");
};

/**
 * Get own active borrows (Member only)
 */
export const getMyActiveBorrows = async (): Promise<BookCopy[]> => {
  return apiClient.get<BookCopy[]>("/api/members/active_borrows/");
};
