import { getTeam } from "@/lib/api";

export default async function Footer() {
  let team: Awaited<ReturnType<typeof getTeam>> = [];
  try { team = await getTeam(); } catch {}

  return (
    <footer className="border-t border-white/10 mt-32">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start gap-10">
          <div>
            <p className="text-sm font-semibold tracking-widest uppercase text-white/90">Soundcritic</p>
            <p className="text-sm text-white/40 mt-1">Where music meets critique.</p>
          </div>

          {team.length > 0 && (
            <div>
              <p className="text-xs tracking-widest uppercase text-white/25 mb-4">The People</p>
              <div className="flex flex-col gap-2">
                {team.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 text-sm text-white/40">
                    <span>{member.fullName}</span>
                    <span className="text-white/20">·</span>
                    <span className="text-white/25 text-xs uppercase tracking-wide">{member.role}</span>
                    <div className="flex gap-2 ml-1">
                      {member.gitHub && (
                        <a href={member.gitHub} target="_blank" rel="noopener noreferrer" className="text-white/25 hover:text-white/60 transition-colors text-xs">GitHub ↗</a>
                      )}
                      {member.linkedIn && (
                        <a href={member.linkedIn} target="_blank" rel="noopener noreferrer" className="text-white/25 hover:text-white/60 transition-colors text-xs">LinkedIn ↗</a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-sm text-white/40 space-y-1">
            <p>studio@soundcrit.com</p>
            <p>© {new Date().getFullYear()} Soundcritic. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
