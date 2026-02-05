// Common utility types

/** Environment identifier */
export type Environment = "development" | "staging" | "production";

/** UUID string type */
export type UUID = string;

/** ISO 8601 date string */
export type ISODateString = string;

/** ISO 8601 datetime string */
export type ISODateTimeString = string;

/** Pagination parameters */
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/** Paginated result metadata */
export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** Make all properties optional recursively */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** Make specific properties required */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/** Omit properties from a type */
export type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

/** Extract non-nullable type */
export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

/** Audit fields for entities */
export interface AuditFields {
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  createdBy?: UUID;
  updatedBy?: UUID;
}

/** Soft delete fields */
export interface SoftDeleteFields {
  deletedAt?: ISODateTimeString;
  deletedBy?: UUID;
  isDeleted: boolean;
}

/** Base entity with common fields */
export interface BaseEntity extends AuditFields {
  id: UUID;
}

/** Tenant-aware entity */
export interface TenantEntity extends BaseEntity {
  organizationId: UUID;
}
