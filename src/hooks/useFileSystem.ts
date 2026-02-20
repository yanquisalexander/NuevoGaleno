import { invoke } from "@tauri-apps/api/core";

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

export const useFileSystem = () => {
    const listDirectory = async (path: string): Promise<DirectoryListing> => {
        return await invoke('fs_list_directory', { virtualPath: path });
    };

    const createFolder = async (path: string, name: string): Promise<FileEntry> => {
        return await invoke('fs_create_folder', { virtualPath: path, folderName: name });
    };

    const deleteEntry = async (path: string): Promise<void> => {
        return await invoke('fs_delete_entry', { virtualPath: path });
    };

    const renameEntry = async (path: string, newName: string): Promise<FileEntry> => {
        return await invoke('fs_rename_entry', { virtualPath: path, newName });
    };

    const moveEntry = async (sourcePath: string, destPath: string): Promise<FileEntry> => {
        return await invoke('fs_move_entry', { sourcePath, destPath });
    };

    const uploadFile = async (
        dir: string,
        file: File,
        onProgress?: (progress: number) => void
    ): Promise<FileEntry> => {
        const data = await file.arrayBuffer();
        return await invoke('fs_upload_file', {
            virtualDir: dir,
            fileData: Array.from(new Uint8Array(data)),
            filename: file.name
        });
    };

    const downloadFile = async (path: string): Promise<Blob> => {
        const data: number[] = await invoke('fs_download_file', { virtualPath: path });
        return new Blob([new Uint8Array(data)]);
    };

    const search = async (query: string, rootPath: string): Promise<FileEntry[]> => {
        return await invoke('fs_search', { query, rootPath });
    };

    const getStorageQuota = async (): Promise<StorageQuota> => {
        return await invoke('fs_get_storage_quota');
    };

    const linkToPatient = async (filePath: string, patientId: number): Promise<void> => {
        return await invoke('fs_link_to_patient', { filePath, patientId });
    };

    const getMetadata = async (path: string): Promise<FileMetadata> => {
        return await invoke('fs_get_metadata', { virtualPath: path });
    };

    const moveToTrash = async (path: string): Promise<void> => {
        return await invoke('fs_move_to_trash', { virtualPath: path });
    };

    const restoreFromTrash = async (trashId: number): Promise<FileEntry> => {
        return await invoke('fs_restore_from_trash', { trashId });
    };

    const emptyTrash = async (): Promise<void> => {
        return await invoke('fs_empty_trash');
    };

    return {
        listDirectory,
        createFolder,
        deleteEntry,
        renameEntry,
        moveEntry,
        uploadFile,
        downloadFile,
        search,
        getStorageQuota,
        linkToPatient,
        getMetadata,
        moveToTrash,
        restoreFromTrash,
        emptyTrash,
    };
};
