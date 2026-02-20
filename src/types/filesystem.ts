export interface FileEntry {
    id: number;
    name: string;
    virtualPath: string;
    entryType: 'file' | 'folder';
    size: number;
    createdAt: string;
    modifiedAt: string;
    ownerUsername: string;
}

export interface DirectoryListing {
    path: string;
    entries: FileEntry[];
    totalCount: number;
}

export interface FileMetadata {
    name: string;
    size: number;
    fileType: string;
    mimeType?: string;
    createdAt: string;
    modifiedAt: string;
    owner: string;
    permissions: FilePermissions;
}

export interface FilePermissions {
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
}

export interface StorageQuota {
    totalBytes: number;
    usedBytes: number;
    availableBytes: number;
    percentageUsed: number;
}

export interface AuditLogEntry {
    id: number;
    timestamp: string;
    username: string;
    operation: string;
    path: string;
    success: boolean;
    errorMessage?: string;
}

export interface FileLock {
    filePath: string;
    lockedBy: string;
    lockedAt: string;
    expiresAt: string;
}

export interface PatientFileLink {
    id: number;
    virtualPath: string;
    patientId: number;
    linkedAt: string;
    linkedBy: string;
    notes?: string;
}

export interface TrashEntry {
    id: number;
    originalVirtualPath: string;
    originalParentPath: string;
    name: string;
    entryType: 'file' | 'folder';
    size: number;
    ownerUsername: string;
    deletedAt: string;
    deletedBy: string;
}
