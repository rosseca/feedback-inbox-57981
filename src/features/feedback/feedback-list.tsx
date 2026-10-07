import Link from 'next/link';
import type { FeedbackDto } from '@/contracts/api';
import { PriorityBadge, StatusBadge } from '@/components/ui/badge';
import styles from './feedback-list.module.css';

export function FeedbackList({ items }: { items: FeedbackDto[] }) {
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item.id} className={styles.item}>
          <Link href={`/feedback/${item.id}`} className={styles.link}>
            <span className={styles.title}>{item.title}</span>
            <span className={styles.meta}>
              <StatusBadge status={item.status} />
              <PriorityBadge priority={item.priority} />
              {item.attachmentFilename ? <span className={styles.attachment}>has attachment</span> : null}
            </span>
          </Link>
          <span className={styles.date}>{formatDate(item.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
