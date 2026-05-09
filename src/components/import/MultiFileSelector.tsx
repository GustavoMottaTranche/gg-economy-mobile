/**
 * MultiFileSelector Component
 *
 * Allows selection of up to 10 files simultaneously for import.
 * Supports mixed file types (CSV, OFX, Excel).
 * Validates file extensions before proceeding.
 *
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**
 */

import React, { useState, useCallback, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useTranslation } from 'react-i18next';
import type { FileType } from '../../types/importBatch';

/**
 * Supported file extensions for import
 */
export const SUPPORTED_EXTENSIONS = ['.csv', '.ofx', '.qfx', '.xlsx', '.xls'] as const;

/**
 * MIME types for supported files
 */
export const SUPPORTED_MIME_TYPES = [
  // Existing formats
  'text/csv',
  'text/comma-separated-values',
  'application/csv',
  'application/x-ofx',
  'application/vnd.intu.qfx',
  'text/plain',
  'application/octet-stream',
  // Excel formats (Requirement 1.4)
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
] as const;

/**
 * Maximum number of files allowed in multi-file import
 */
export const MAX_MULTI_FILE_COUNT = 10;

/**
 * Represents a file selected for import
 */
export interface SelectedFile {
  /** File URI */
  uri: string;
  /** File name */
  fileName: string;
  /** Detected file type */
  fileType: FileType;
  /** File size in bytes */
  size: number;
}

/**
 * Props for the MultiFileSelector component
 */
export interface MultiFileSelectorProps {
  /** Maximum files allowed (default: 10) */
  maxFiles?: number;
  /** Callback when files are selected */
  onFilesSelected: (files: SelectedFile[]) => void;
  /** Callback when selection is cancelled */
  onCancel: () => void;
}

/**
 * File type icons for display
 */
const FILE_TYPE_ICONS: Record<FileType, string> = {
  csv: '📊',
  ofx: '🏦',
  qif: '📄',
  xlsx: '📗',
  xls: '📗',
};

/**
 * Detects file type from file name extension
 */
function detectFileType(fileName: string): FileType | undefined {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.csv')) return 'csv';
  if (lowerName.endsWith('.ofx') || lowerName.endsWith('.qfx')) return 'ofx';
  if (lowerName.endsWith('.qif')) return 'qif';
  if (lowerName.endsWith('.xlsx')) return 'xlsx';
  if (lowerName.endsWith('.xls')) return 'xls';

  return undefined;
}

/**
 * Validates that a file has a supported extension
 */
function hasValidExtension(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
}

/**
 * Formats file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Individual file item component
 */
const FileItem = memo(function FileItem({
  file,
  onRemove,
}: {
  file: SelectedFile;
  onRemove: (uri: string) => void;
}): JSX.Element {
  const { t } = useTranslation();

  const handleRemove = useCallback(() => {
    onRemove(file.uri);
  }, [file.uri, onRemove]);

  const icon = FILE_TYPE_ICONS[file.fileType] || '📄';

  return (
    <View style={styles.fileItem} testID={`file-item-${file.fileName}`}>
      <View style={styles.fileItemContent}>
        <Text style={styles.fileIcon}>{icon}</Text>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {file.fileName}
          </Text>
          <Text style={styles.fileSize}>
            {formatFileSize(file.size)} • {file.fileType.toUpperCase()}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={handleRemove}
        accessibilityRole="button"
        accessibilityLabel={t('common.remove')}
        testID={`remove-file-${file.fileName}`}
      >
        <Text style={styles.removeButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
});

/**
 * MultiFileSelector component
 *
 * @example
 * ```tsx
 * <MultiFileSelector
 *   maxFiles={10}
 *   onFilesSelected={(files) => handleImport(files)}
 *   onCancel={() => navigation.goBack()}
 * />
 * ```
 */
function MultiFileSelectorComponent({
  maxFiles = MAX_MULTI_FILE_COUNT,
  onFilesSelected,
  onCancel,
}: MultiFileSelectorProps): JSX.Element {
  const { t } = useTranslation();
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);

  /**
   * Opens the document picker for file selection
   */
  const handleSelectFiles = useCallback(async () => {
    if (isSelecting) return;

    setIsSelecting(true);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: SUPPORTED_MIME_TYPES as unknown as string[],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled) {
        setIsSelecting(false);
        return;
      }

      const newFiles: SelectedFile[] = [];
      const invalidFiles: string[] = [];

      for (const asset of result.assets) {
        // Validate extension (Requirement 4.6)
        if (!hasValidExtension(asset.name)) {
          invalidFiles.push(asset.name);
          continue;
        }

        const fileType = detectFileType(asset.name);
        if (!fileType) {
          invalidFiles.push(asset.name);
          continue;
        }

        // Check if file is already selected
        const isDuplicate = selectedFiles.some(
          (f) => f.fileName === asset.name && f.size === (asset.size ?? 0)
        );

        if (!isDuplicate) {
          newFiles.push({
            uri: asset.uri,
            fileName: asset.name,
            fileType,
            size: asset.size ?? 0,
          });
        }
      }

      // Show warning for invalid files
      if (invalidFiles.length > 0) {
        Alert.alert(
          t('import.multiFile.invalidFiles'),
          t('import.multiFile.invalidFilesMessage', {
            files: invalidFiles.join(', '),
            formats: SUPPORTED_EXTENSIONS.join(', '),
          })
        );
      }

      // Check max file limit (Requirement 4.2)
      const totalFiles = selectedFiles.length + newFiles.length;
      if (totalFiles > maxFiles) {
        const allowedCount = maxFiles - selectedFiles.length;
        const filesToAdd = newFiles.slice(0, allowedCount);

        Alert.alert(
          t('import.multiFile.limitExceeded'),
          t('import.multiFile.limitExceededMessage', { max: maxFiles })
        );

        setSelectedFiles((prev) => [...prev, ...filesToAdd]);
      } else {
        setSelectedFiles((prev) => [...prev, ...newFiles]);
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('import.multiFile.selectionError'));
    } finally {
      setIsSelecting(false);
    }
  }, [isSelecting, selectedFiles, maxFiles, t]);

  /**
   * Removes a file from the selection
   */
  const handleRemoveFile = useCallback((uri: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.uri !== uri));
  }, []);

  /**
   * Confirms the selection and proceeds with import
   */
  const handleConfirm = useCallback(() => {
    if (selectedFiles.length === 0) {
      Alert.alert(t('import.multiFile.noFiles'), t('import.multiFile.noFilesMessage'));
      return;
    }

    onFilesSelected(selectedFiles);
  }, [selectedFiles, onFilesSelected, t]);

  /**
   * Cancels the selection (Requirement 4.5)
   */
  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  /**
   * Clears all selected files
   */
  const handleClearAll = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  const renderFileItem = useCallback(
    ({ item }: { item: SelectedFile }) => <FileItem file={item} onRemove={handleRemoveFile} />,
    [handleRemoveFile]
  );

  const keyExtractor = useCallback((item: SelectedFile) => item.uri, []);

  const canAddMore = selectedFiles.length < maxFiles;
  const hasFiles = selectedFiles.length > 0;

  return (
    <View style={styles.container} testID="multi-file-selector">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('import.multiFile.title')}</Text>
        <Text style={styles.subtitle}>
          {t('import.multiFile.subtitle', {
            formats: SUPPORTED_EXTENSIONS.join(', '),
          })}
        </Text>
      </View>

      {/* File Count Display (Requirement 4.4) */}
      <View style={styles.countContainer}>
        <Text style={styles.countText} testID="file-count">
          {t('import.multiFile.fileCount', {
            count: selectedFiles.length,
            max: maxFiles,
          })}
        </Text>
        {hasFiles && (
          <TouchableOpacity
            onPress={handleClearAll}
            accessibilityRole="button"
            accessibilityLabel={t('import.multiFile.clearAll')}
            testID="clear-all-button"
          >
            <Text style={styles.clearAllText}>{t('import.multiFile.clearAll')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* File List */}
      {hasFiles ? (
        <FlatList
          data={selectedFiles}
          renderItem={renderFileItem}
          keyExtractor={keyExtractor}
          style={styles.fileList}
          contentContainerStyle={styles.fileListContent}
          showsVerticalScrollIndicator={false}
          testID="selected-files-list"
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📁</Text>
          <Text style={styles.emptyText}>{t('import.multiFile.noFilesSelected')}</Text>
          <Text style={styles.emptyHint}>{t('import.multiFile.tapToSelect')}</Text>
        </View>
      )}

      {/* Add Files Button */}
      {canAddMore && (
        <TouchableOpacity
          style={[styles.addButton, isSelecting && styles.addButtonDisabled]}
          onPress={handleSelectFiles}
          disabled={isSelecting}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('import.multiFile.addFiles')}
          testID="add-files-button"
        >
          <Text style={styles.addButtonIcon}>+</Text>
          <Text style={styles.addButtonText}>
            {isSelecting ? t('common.loading') : t('import.multiFile.addFiles')}
          </Text>
        </TouchableOpacity>
      )}

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
          testID="cancel-button"
        >
          <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.confirmButton, !hasFiles && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={!hasFiles}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('import.multiFile.importFiles')}
          accessibilityState={{ disabled: !hasFiles }}
          testID="confirm-button"
        >
          <Text style={[styles.confirmButtonText, !hasFiles && styles.confirmButtonTextDisabled]}>
            {t('import.multiFile.importFiles')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Styles for MultiFileSelector
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  countContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  clearAllText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
  fileList: {
    flex: 1,
  },
  fileListContent: {
    paddingVertical: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  fileItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: '#6b7280',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  removeButtonText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 14,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonIcon: {
    fontSize: 20,
    color: '#3b82f6',
    fontWeight: '600',
    marginRight: 8,
  },
  addButtonText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 14,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  confirmButtonTextDisabled: {
    color: '#9ca3af',
  },
});

/**
 * Memoized MultiFileSelector for performance optimization
 */
export const MultiFileSelector = memo(MultiFileSelectorComponent);

export default MultiFileSelector;
