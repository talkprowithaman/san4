import VakMascot from './VakMascot'

export default function LoadingScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#050810' }}
    >
      <div className="text-center animate-fade-in">
        {/* Vak floating */}
        <div className="flex justify-center mb-5 animate-float">
          <VakMascot level={1} size={96} />
        </div>

        {/* Logo */}
        <div className="text-3xl font-black text-white mb-5 tracking-tight">
          San<span style={{ color: '#7B5EA7' }}>4</span>
        </div>

        {/* Loading dots */}
        <div className="flex gap-2 justify-center">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full animate-bounce-slow"
              style={{
                background: '#7B5EA7',
                animationDelay: `${i * 0.18}s`,
                opacity: 0.8,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
