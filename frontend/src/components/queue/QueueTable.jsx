import Badge from "../ui/Badge";
import {
  formatDateTime,
  formatWaitLabel,
  toPriorityTone,
  toStatusTone,
} from "../../utils/format";

const QueueTable = ({
  queue = [],
  showActions = false,
  onComplete,
  onSkip,
  actionBusyId = null,
  emptyMessage = "No tokens in queue.",
}) => {
  if (!queue.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-[0.08em] text-slate-600">
            <tr>
              <th className="px-4 py-3">Token</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Position</th>
              <th className="px-4 py-3">Est. Wait</th>
              <th className="px-4 py-3">Created</th>
              {showActions && <th className="px-4 py-3">Actions</th>}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-sm">
            {queue.map((item) => {
              const isPriority = item.priority === "priority";
              const busy = actionBusyId === item._id;
              const canComplete = item.status === "serving";
              const canSkip =
                item.status === "waiting" || item.status === "serving";

              return (
                <tr
                  key={item._id}
                  className={isPriority ? "bg-orange-50/50" : "bg-white"}
                >
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {item.displayToken}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={toPriorityTone(item.priority)}>
                      {item.priority}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={toStatusTone(item.status)}>
                      {item.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {item.position ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatWaitLabel(item.estimatedWaitMinutes)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDateTime(item.createdAt)}
                  </td>

                  {showActions && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={!canComplete || busy}
                          onClick={() => onComplete?.(item)}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Complete
                        </button>

                        <button
                          type="button"
                          disabled={!canSkip || busy}
                          onClick={() => onSkip?.(item)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Skip
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QueueTable;
