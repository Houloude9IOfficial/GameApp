import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Trash2, Edit2 } from 'lucide-react';
import { Review, ReviewSummary } from '../../../shared/types';
import { StarRating } from '../common/StarRating';
import { useAuthStore } from '../../stores/useAuthStore';
import { formatRelativeTime } from '../../utils/formatters';
import toast from 'react-hot-toast';

interface ReviewSectionProps {
  gameId: string;
}

export function ReviewSection({ gameId }: ReviewSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const username = useAuthStore(s => s.username);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reviewsResult, summaryResult] = await Promise.all([
        window.electronAPI.getReviews(gameId, { limit: 20 }),
        window.electronAPI.getReviewSummary(gameId),
      ]);
      setReviews(reviewsResult.reviews);
      setTotal(reviewsResult.total);
      setSummary(summaryResult);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [gameId]);

  const existingReview = reviews.find(r => r.username === username);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-text-primary">Reviews</h3>
          {summary && summary.totalReviews > 0 && (
            <div className="flex items-center gap-2">
              <StarRating rating={summary.averageRating} size={14} />
              <span className="text-sm text-text-secondary">{summary.averageRating.toFixed(1)}</span>
              <span className="text-xs text-text-muted">({summary.totalReviews})</span>
            </div>
          )}
        </div>
        {!existingReview && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-primary hover:opacity-90 transition-opacity"
          >
            <MessageSquare size={12} /> Write a Review
          </button>
        )}
      </div>

      {/* Rating Distribution */}
      {summary && summary.totalReviews > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-4 space-y-1.5">
          {[5, 4, 3, 2, 1].map(star => {
            const count = summary.distribution[star] || 0;
            const pct = summary.totalReviews > 0 ? (count / summary.totalReviews) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-text-muted text-right">{star}</span>
                <StarRating rating={star} size={10} />
                <div className="flex-1 h-1.5 bg-surface-active rounded-full overflow-hidden">
                  <div className="h-full bg-warning rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-6 text-text-muted text-right">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Form */}
      {showForm && <ReviewForm gameId={gameId} onDone={() => { setShowForm(false); fetchData(); }} />}

      {/* Edit Existing */}
      {existingReview && (
        <div className="bg-card border-2 border-accent/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-accent">Your Review</span>
            <div className="flex gap-1">
              <button onClick={() => setShowForm(true)} className="text-text-muted hover:text-text-primary p-1"><Edit2 size={12} /></button>
              <button
                onClick={async () => {
                  try {
                    await window.electronAPI.deleteReview(gameId, existingReview.id);
                    toast.success('Review deleted');
                    fetchData();
                  } catch { toast.error('Failed to delete review'); }
                }}
                className="text-text-muted hover:text-danger p-1"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
          <StarRating rating={existingReview.rating} size={14} />
          {existingReview.title && <p className="text-sm font-medium text-text-primary mt-1">{existingReview.title}</p>}
          {existingReview.body && <p className="text-xs text-text-secondary mt-0.5">{existingReview.body}</p>}
        </div>
      )}

      {/* Review List */}
      {loading ? (
        <div className="py-4 text-center text-text-muted text-sm">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="py-8 text-center text-text-muted text-sm">No reviews yet. Be the first!</div>
      ) : (
        <div className="space-y-3">
          {reviews.filter(r => r.username !== username).map(review => (
            <div key={review.id} className="bg-card border border-card-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-text-primary">{review.username}</span>
                <span className="text-[10px] text-text-muted">{formatRelativeTime(review.createdAt)}</span>
              </div>
              <StarRating rating={review.rating} size={12} />
              {review.title && <p className="text-sm font-medium text-text-primary mt-1.5">{review.title}</p>}
              {review.body && <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{review.body}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewForm({ gameId, onDone }: { gameId: string; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { toast.error('Please select a rating'); return; }
    setSubmitting(true);
    try {
      await window.electronAPI.createReview(gameId, { rating, title: title || undefined, body: body || undefined });
      toast.success('Review submitted!');
      onDone();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-card-border rounded-xl p-4 space-y-3">
      <div>
        <label className="text-xs font-medium text-text-secondary mb-1 block">Rating</label>
        <StarRating rating={rating} interactive onChange={setRating} size={20} />
      </div>
      <div>
        <label className="text-xs font-medium text-text-secondary mb-1 block">Title (optional)</label>
        <input
          type="text"
          maxLength={100}
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full px-3 py-1.5 rounded-lg bg-surface border border-card-border text-sm text-text-primary focus:border-accent focus:outline-none"
          placeholder="Summary of your review"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-text-secondary mb-1 block">Review (optional)</label>
        <textarea
          maxLength={2000}
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={3}
          className="w-full px-3 py-1.5 rounded-lg bg-surface border border-card-border text-sm text-text-primary focus:border-accent focus:outline-none resize-none"
          placeholder="What did you think?"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onDone} className="px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary transition-colors">
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || rating === 0}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-accent text-primary hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <Send size={12} /> {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </form>
  );
}
