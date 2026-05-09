/**
 * EmptyState Component Tests
 *
 * Tests for the EmptyState component including:
 * - Rendering icon, title, description
 * - Action button functionality
 * - Compact mode
 * - Accessibility support
 *
 * **Validates: Requirements 30**
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  EmptyState,
  EmptyTransactions,
  EmptyReview,
  EmptyCategories,
  EmptyBackups,
  EmptySearchResults,
  type EmptyStateProps,
} from '../EmptyState';

describe('EmptyState', () => {
  const defaultProps: EmptyStateProps = {
    title: 'No items found',
  };

  it('renders title', () => {
    const { getByText } = render(<EmptyState {...defaultProps} />);
    expect(getByText('No items found')).toBeTruthy();
  });

  it('renders default icon', () => {
    const { getByTestId } = render(<EmptyState {...defaultProps} testID="empty" />);
    // Icon is rendered but hidden from accessibility
    expect(getByTestId('empty')).toBeTruthy();
  });

  it('renders custom icon', () => {
    const { getByTestId } = render(<EmptyState {...defaultProps} icon="🔍" testID="empty" />);
    expect(getByTestId('empty')).toBeTruthy();
  });

  it('renders description when provided', () => {
    const { getByText } = render(
      <EmptyState {...defaultProps} description="Try adding some items" />
    );
    expect(getByText('Try adding some items')).toBeTruthy();
  });

  it('does not render description when not provided', () => {
    const { queryByText } = render(<EmptyState {...defaultProps} />);
    expect(queryByText('Try adding some items')).toBeNull();
  });

  it('renders action button when action is provided', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <EmptyState {...defaultProps} action={{ label: 'Add Item', onPress }} />
    );
    expect(getByText('Add Item')).toBeTruthy();
  });

  it('calls action onPress when button is pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <EmptyState {...defaultProps} action={{ label: 'Add Item', onPress }} />
    );

    fireEvent.press(getByText('Add Item'));

    expect(onPress).toHaveBeenCalled();
  });

  it('does not render action button when action is not provided', () => {
    const { queryByRole } = render(<EmptyState {...defaultProps} />);
    expect(queryByRole('button')).toBeNull();
  });

  it('applies compact styling when compact is true', () => {
    const { getByTestId } = render(<EmptyState {...defaultProps} compact testID="empty-state" />);
    const container = getByTestId('empty-state');
    expect(container.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ padding: 16 })])
    );
  });

  it('applies default styling when compact is false', () => {
    const { getByTestId } = render(<EmptyState {...defaultProps} testID="empty-state" />);
    const container = getByTestId('empty-state');
    expect(container.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ padding: 32 })])
    );
  });

  it('has correct accessibility label', () => {
    const { getByLabelText } = render(
      <EmptyState {...defaultProps} description="Try adding some items" />
    );
    expect(getByLabelText('No items found. Try adding some items')).toBeTruthy();
  });

  it('action button has correct accessibility role', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <EmptyState {...defaultProps} action={{ label: 'Add Item', onPress }} />
    );
    expect(getByRole('button')).toBeTruthy();
  });

  it('applies custom style', () => {
    const customStyle = { marginTop: 20 };
    const { getByTestId } = render(
      <EmptyState {...defaultProps} style={customStyle} testID="empty-state" />
    );
    const container = getByTestId('empty-state');
    expect(container.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining(customStyle)])
    );
  });

  it('applies custom icon style', () => {
    const customIconStyle = { fontSize: 80 };
    const { getByTestId } = render(
      <EmptyState {...defaultProps} iconStyle={customIconStyle} testID="empty" />
    );
    // Just verify the component renders with custom style
    expect(getByTestId('empty')).toBeTruthy();
  });

  it('applies custom title style', () => {
    const customTitleStyle = { color: '#ff0000' };
    const { getByText } = render(<EmptyState {...defaultProps} titleStyle={customTitleStyle} />);
    const title = getByText('No items found');
    expect(title.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining(customTitleStyle)])
    );
  });

  it('applies custom description style', () => {
    const customDescriptionStyle = { color: '#0000ff' };
    const { getByText } = render(
      <EmptyState
        {...defaultProps}
        description="Try adding some items"
        descriptionStyle={customDescriptionStyle}
      />
    );
    const description = getByText('Try adding some items');
    expect(description.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining(customDescriptionStyle)])
    );
  });

  describe('pre-configured components', () => {
    describe('EmptyTransactions', () => {
      it('renders with correct content', () => {
        const { getByText, getByTestId } = render(<EmptyTransactions />);
        expect(getByTestId('empty-transactions')).toBeTruthy();
        expect(getByText('No transactions yet')).toBeTruthy();
        expect(getByText('Import a statement or add manually')).toBeTruthy();
      });

      it('renders import button when onImport is provided', () => {
        const onImport = jest.fn();
        const { getByText } = render(<EmptyTransactions onImport={onImport} />);

        fireEvent.press(getByText('Import'));

        expect(onImport).toHaveBeenCalled();
      });

      it('renders add button when onAddManual is provided', () => {
        const onAddManual = jest.fn();
        const { getByText } = render(<EmptyTransactions onAddManual={onAddManual} />);

        fireEvent.press(getByText('Add Transaction'));

        expect(onAddManual).toHaveBeenCalled();
      });
    });

    describe('EmptyReview', () => {
      it('renders with correct content', () => {
        const { getByText, getByTestId } = render(<EmptyReview />);
        expect(getByTestId('empty-review')).toBeTruthy();
        expect(getByText('Nothing to review')).toBeTruthy();
        expect(getByText('Import transactions to get started')).toBeTruthy();
      });

      it('renders import button when onImport is provided', () => {
        const onImport = jest.fn();
        const { getByText } = render(<EmptyReview onImport={onImport} />);

        fireEvent.press(getByText('Import'));

        expect(onImport).toHaveBeenCalled();
      });
    });

    describe('EmptyCategories', () => {
      it('renders with correct content', () => {
        const { getByText, getByTestId } = render(<EmptyCategories />);
        expect(getByTestId('empty-categories')).toBeTruthy();
        expect(getByText('No categories')).toBeTruthy();
        expect(getByText('Add categories to organize your transactions')).toBeTruthy();
      });

      it('renders add button when onAdd is provided', () => {
        const onAdd = jest.fn();
        const { getByText } = render(<EmptyCategories onAdd={onAdd} />);

        fireEvent.press(getByText('Add Category'));

        expect(onAdd).toHaveBeenCalled();
      });
    });

    describe('EmptyBackups', () => {
      it('renders with correct content', () => {
        const { getByText, getByTestId } = render(<EmptyBackups />);
        expect(getByTestId('empty-backups')).toBeTruthy();
        expect(getByText('No backups')).toBeTruthy();
        expect(getByText('Connect your Google account to backup')).toBeTruthy();
      });

      it('renders connect button when onConnect is provided', () => {
        const onConnect = jest.fn();
        const { getByText } = render(<EmptyBackups onConnect={onConnect} />);

        fireEvent.press(getByText('Connect'));

        expect(onConnect).toHaveBeenCalled();
      });
    });

    describe('EmptySearchResults', () => {
      it('renders with correct content', () => {
        const { getByText, getByTestId } = render(<EmptySearchResults />);
        expect(getByTestId('empty-search')).toBeTruthy();
        expect(getByText('No results found')).toBeTruthy();
        expect(getByText('Try adjusting your search or filters')).toBeTruthy();
      });

      it('renders in compact mode', () => {
        const { getByTestId } = render(<EmptySearchResults />);
        const container = getByTestId('empty-search');
        expect(container.props.style).toEqual(
          expect.arrayContaining([expect.objectContaining({ padding: 16 })])
        );
      });

      it('renders clear button when onClear is provided', () => {
        const onClear = jest.fn();
        const { getByText } = render(<EmptySearchResults onClear={onClear} />);

        fireEvent.press(getByText('Clear Search'));

        expect(onClear).toHaveBeenCalled();
      });
    });
  });
});
