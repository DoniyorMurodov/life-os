export default function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" focusable="false">
      <rect width="512" height="512" rx="120" fill="#0f172a" />
      <rect x="176" y="140" width="60" height="232" rx="30" fill="#3b82f6" />
      <rect x="176" y="312" width="160" height="60" rx="30" fill="#3b82f6" />
      <circle cx="316" cy="176" r="32" fill="#93c5fd" />
    </svg>
  );
}
