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
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius } from '../../constants/theme';

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
}): React.JSX.Element {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const handleRemove = useCallback(() => {
    onRemove(file.uri);
  }, [file.uri, onRemove]);

  const icon = FILE_TYPE_ICONS[file.fileType] || '📄';

  return (
    <View style={[styles.fileItem, { borderBottomColor: colors.border.subtle }]} testID={`file-item-${file.fileName}`}>
      <View style={styles.fileItemContent}>
        <Text style={styles.fileIcon}>{icon}</Text>
        <View style={styles.fileInfo}>
          <Text style={[styles.fileName, { color: colors.text.primary }]} numberOfLines={1}>
            {file.fileName}
          </Text>
          <Text style={[styles.fileSize, { color: colors.text.secondary }]}>
            {formatFileSize(file.size)} • {file.fileType.toUpperCase()}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.removeButton, { backgroundColor: colors.semantic.danger.light }]}
        onPress={handleRemove}
        accessibilityRole="button"
        accessibilityLabel={t('common.remove')}
        testID={`remove-file-${file.fileName}`}
      >
        <Text style={[styles.removeButtonText, { color: colors.semantic.danger.base }]}>✕</Text>
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
}: MultiFileSelectorProps): React.JSX.Element {
  const { t } = useTranslation();
  const colors = useThemeColors();
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
          t('fileImport.multiFile.invalidFiles'),
          t('fileImport.multiFile.invalidFilesMessage', {
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
          t('fileImport.multiFile.limitExceeded'),
          t('fileImport.multiFile.limitExceededMessage', { max: maxFiles })
        );

        setSelectedFiles((prev) => [...prev, ...filesToAdd]);
      } else {
        setSelectedFiles((prev) => [...prev, ...newFiles]);
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('fileImport.multiFile.selectionError'));
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
      Alert.alert(t('fileImport.multiFile.noFiles'), t('fileImport.multiFile.noFilesMessage'));
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
    <View style={[styles.container, { backgroundColor: colors.surface.card }]} testID="multi-file-selector">
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text.primary }]}>{t('fileImport.multiFile.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
          {t('fileImport.multiFile.subtitle', {
            formats: SUPPORTED_EXTENSIONS.join(', '),
          })}
        </Text>
      </View>

      {/* File Count Display (Requirement 4.4) */}
      <View style={[styles.countContainer, { backgroundColor: colors.background.secondary, borderColor: colors.border.default }]}>
        <Text style={[styles.countText, { color: colors.text.primary }]} testID="file-count">
          {t('fileImport.multiFile.fileCount', {
            count: selectedFiles.length,
            max: maxFiles,
          })}
        </Text>
        {hasFiles && (
          <TouchableOpacity
            onPress={handleClearAll}
            accessibilityRole="button"
            accessibilityLabel={t('fileImport.multiFile.clearAll')}
            testID="clear-all-button"
          >
            <Text style={[styles.clearAllText, { color: colors.semantic.danger.base }]}>{t('fileImport.multiFile.clearAll')}</Text>
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
          <Text style={[styles.emptyText, { color: colors.text.primary }]}>{t('fileImport.multiFile.noFilesSelected')}</Text>
          <Text style={[styles.emptyHint, { color: colors.text.secondary }]}>{t('fileImport.multiFile.tapToSelect')}</Text>
        </View>
      )}

      {/* Add Files Button */}
      {canAddMore && (
        <TouchableOpacity
          style={[
            styles.addButton,
            { backgroundColor: colors.background.tertiary, borderColor: colors.border.default },
            isSelecting && styles.addButtonDisabled,
          ]}
          onPress={handleSelectFiles}
          disabled={isSelecting}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('fileImport.multiFile.addFiles')}
          testID="add-files-button"
        >
          <Text style={[styles.addButtonIcon, { color: colors.interactive.primary }]}>+</Text>
          <Text style={[styles.addButtonText, { color: colors.interactive.primary }]}>
            {isSelecting ? t('common.loading') : t('fileImport.multiFile.addFiles')}
          </Text>
        </TouchableOpacity>
      )}

      {/* Action Buttons */}
      <View style={[styles.actionContainer, { borderTopColor: colors.border.default }]}>
        <TouchableOpacity
          style={[styles.cancelButton, { backgroundColor: colors.background.tertiary }]}
          onPress={handleCancel}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
          testID="cancel-button"
        >
          <Text style={[styles.cancelButtonText, { color: colors.text.primary }]}>{t('common.cancel')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.confirmButton,
            { backgroundColor: colors.interactive.primary },
            !hasFiles && { backgroundColor: colors.interactive.disabled },
          ]}
          onPress={handleConfirm}
          disabled={!hasFiles}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('fileImport.multiFile.importFiles')}
          accessibilityState={{ disabled: !hasFiles }}
          testID="confirm-button"
        >
          <Text style={[
            styles.confirmButtonText,
            { color: colors.text.inverse },
            !hasFiles && { color: colors.text.tertiary },
          ]}>
            {t('fileImport.multiFile.importFiles')}
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
  },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  countContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  fileList: {
    flex: 1,
  },
  fileListContent: {
    paddingVertical: spacing.sm,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  fileItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileIcon: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.base,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.base,
    marginVertical: spacing.md,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonIcon: {
    fontSize: 20,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

/**
 * Memoized MultiFileSelector for performance optimization
 */
export const MultiFileSelector = memo(MultiFileSelectorComponent);

export default MultiFileSelector;
