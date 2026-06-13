'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { updateEngagementSchedule } from '@/app/actions/engagement';
import {
  EngagementScheduleFields,
  engagementToScheduleValues,
  type EngagementScheduleValues,
} from './EngagementScheduleFields';

export type ScheduleEngagement = {
  id: string;
  codeName: string;
  startPrep?: string | Date | null;
  endPrep?: string | Date | null;
  startRecon?: string | Date | null;
  endRecon?: string | Date | null;
  startTesting?: string | Date | null;
  endTesting?: string | Date | null;
  startReporting?: string | Date | null;
  endReporting?: string | Date | null;
  outbrief?: string | Date | null;
};

type EngagementScheduleModalProps = {
  engagement: ScheduleEngagement | null;
  isAdmin?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (engagement: ScheduleEngagement) => void;
};

export function EngagementScheduleModal({
  engagement,
  isAdmin = false,
  isOpen,
  onClose,
  onUpdated,
}: EngagementScheduleModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<EngagementScheduleValues>(
    engagement ? engagementToScheduleValues(engagement) : engagementToScheduleValues({})
  );

  useEffect(() => {
    if (!engagement) return;
    setFormData(engagementToScheduleValues(engagement));
    setError(null);
    setIsEditing(false);
  }, [engagement, isOpen]);

  const handleClose = () => {
    onClose();
    setIsEditing(false);
    setError(null);
  };

  const handleSave = async () => {
    if (!engagement) return;

    setIsPending(true);
    setError(null);
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value);
      });
      const result = await updateEngagementSchedule(engagement.id, data);
      if (result?.error) {
        setError(result.error);
      } else {
        const toNullableIso = (iso: string) => iso || null;
        onUpdated?.({
          ...engagement,
          startPrep: toNullableIso(formData.startPrep),
          endPrep: toNullableIso(formData.endPrep),
          startRecon: toNullableIso(formData.startRecon),
          endRecon: toNullableIso(formData.endRecon),
          startTesting: toNullableIso(formData.startTesting),
          endTesting: toNullableIso(formData.endTesting),
          startReporting: toNullableIso(formData.startReporting),
          endReporting: toNullableIso(formData.endReporting),
          outbrief: toNullableIso(formData.outbrief),
        });
        setIsEditing(false);
      }
    } catch {
      setError('An error occurred while saving the schedule.');
    } finally {
      setIsPending(false);
    }
  };

  const handleCancel = () => {
    if (!engagement) return;
    setFormData(engagementToScheduleValues(engagement));
    setError(null);
    setIsEditing(false);
  };

  if (!engagement) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Engagement Schedule' : 'Engagement Schedule'}
      maxWidth="560px"
      zIndex={1100}
      headerActions={isEditing ? (
        <>
          <button
            type="button"
            onClick={handleSave}
            className="btn-save"
            style={{ boxShadow: 'none' }}
            disabled={isPending}
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="btn-cancel"
            style={{ boxShadow: 'none' }}
            disabled={isPending}
          >
            Cancel
          </button>
        </>
      ) : isAdmin ? (
        <button
          type="button"
          className="modal-action-btn"
          onClick={() => {
            setFormData(engagementToScheduleValues(engagement));
            setError(null);
            setIsEditing(true);
          }}
        >
          Edit
        </button>
      ) : undefined}
    >
      <div style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        {engagement.codeName}
      </div>
      <EngagementScheduleFields
        values={formData}
        readOnly={!isEditing}
        onFieldChange={(field, value) => setFormData((prev) => ({ ...prev, [field]: value }))}
      />
      {error ? (
        <div style={{ color: '#ff4444', textAlign: 'center', marginTop: '0.75rem', fontSize: '0.85rem' }}>
          {error}
        </div>
      ) : null}
    </Modal>
  );
}