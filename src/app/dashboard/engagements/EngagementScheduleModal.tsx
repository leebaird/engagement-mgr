'use client';

import type { ReactNode } from 'react';
import { Modal } from '@/components/Modal';
import { updateEngagementScheduleFromDetail } from '@/app/actions/engagement';
import { DetailEditCancelLink, DetailEditFormFields, DetailSaveErrorBanner, saveErrorMessage } from '@/components/DetailModalActions';
import { engagementToScheduleValues } from '@/lib/date-input-value';
import { EngagementScheduleFields } from './EngagementScheduleFields';

const EDIT_SCHEDULE_FORM_ID = 'edit-engagement-schedule-form';

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
  engagement: ScheduleEngagement;
  isAdmin?: boolean;
  isOpen: boolean;
  isEditing?: boolean;
  closeHref: string;
  scheduleViewHref: string;
  scheduleEditHref: string;
  scheduleError?: string;
  scheduleEditFields?: ReactNode;
  sort?: string;
  dir?: string;
  activeFindingId?: string;
};

export function EngagementScheduleModal({
  engagement,
  isAdmin = false,
  isOpen,
  isEditing = false,
  closeHref,
  scheduleViewHref,
  scheduleEditHref,
  scheduleError,
  scheduleEditFields,
  sort,
  dir,
  activeFindingId,
}: EngagementScheduleModalProps) {
  const scheduleValues = engagementToScheduleValues(engagement);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen
      closeHref={closeHref}
      title={isEditing ? 'Edit Engagement Schedule' : 'Engagement Schedule'}
      maxWidth="560px"
      zIndex={1100}
      headerActions={isEditing ? (
        <>
          <button
            type="submit"
            form={EDIT_SCHEDULE_FORM_ID}
            className="btn-save"
            style={{ boxShadow: 'none' }}
          >
            Save
          </button>
          <DetailEditCancelLink viewHref={scheduleViewHref} />
        </>
      ) : isAdmin ? (
        <a href={scheduleEditHref} className="modal-action-btn" style={{ textDecoration: 'none' }}>
          Edit
        </a>
      ) : undefined}
    >
      {isEditing ? (
        <form
          id={EDIT_SCHEDULE_FORM_ID}
          key={`schedule-edit-${engagement.id}`}
          action={updateEngagementScheduleFromDetail}
        >
          <DetailEditFormFields
            recordId={engagement.id}
            sort={sort}
            dir={dir}
            extraFields={activeFindingId ? { finding: activeFindingId } : undefined}
          />
          {scheduleEditFields}
          {saveErrorMessage(scheduleError) ? (
            <DetailSaveErrorBanner message={saveErrorMessage(scheduleError)!} />
          ) : null}
        </form>
      ) : (
        <EngagementScheduleFields values={scheduleValues} />
      )}
    </Modal>
  );
}