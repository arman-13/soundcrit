export const dynamic = "force-dynamic";

import { getTeam } from "@/lib/api";
import Image from "next/image";

export default async function AboutPage() {
  const team = await getTeam();

  return (
    <div className="max-w-6xl mx-auto px-6 py-20">

      {/* Mission */}
      <section className="mb-24 max-w-2xl">
        <p className="text-xs tracking-widest uppercase text-white/30 mb-4">Mission</p>
        <h1 className="text-4xl font-light text-white/90 mb-8">We make music for people who still listen carefully.</h1>
        <div className="space-y-4 text-base text-white/45 leading-relaxed">
          <p>
            Collective is an independent music studio built around one idea: that music made without commercial pressure sounds different. Better. We work at our own pace, release on our own terms, and answer to no one except the work itself.
          </p>
          <p>
            We produce across genres — ambient, electronic, lo-fi, experimental — but the through-line is always intention. Every track has a reason to exist. We write liner notes, publish the stories behind the songs, and believe the context around music is part of the music.
          </p>
          <p>
            No label. No algorithm to feed. No tour. Just the four of us, our tools, and a shared conviction that the best creative work happens at the margins.
          </p>
        </div>
      </section>

      {/* Team */}
      <section>
        <p className="text-xs tracking-widest uppercase text-white/30 mb-10">The People</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {team.map((member) => (
            <div key={member.id} className="flex gap-6">
              <div className="relative w-20 h-20 rounded-full overflow-hidden bg-white/5 shrink-0">
                <Image src={member.avatarUrl} alt={member.fullName} fill className="object-cover opacity-80" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-medium text-white/90 mb-0.5">{member.fullName}</h2>
                <p className="text-xs tracking-widest uppercase text-white/35 mb-3">{member.role}</p>
                <p className="text-sm text-white/45 leading-relaxed mb-4">{member.bio}</p>
                <div className="flex flex-wrap gap-3">
                  <a href={`mailto:${member.email}`} className="text-xs text-white/30 hover:text-white/60 transition-colors">
                    ✉ {member.email}
                  </a>
                  {member.phone && (
                    <a href={`tel:${member.phone}`} className="text-xs text-white/30 hover:text-white/60 transition-colors">
                      ☎ {member.phone}
                    </a>
                  )}
                  {member.gitHub && (
                    <a href={member.gitHub} target="_blank" rel="noopener noreferrer" className="text-xs text-white/30 hover:text-white/60 transition-colors">
                      GitHub ↗
                    </a>
                  )}
                  {member.linkedIn && (
                    <a href={member.linkedIn} target="_blank" rel="noopener noreferrer" className="text-xs text-white/30 hover:text-white/60 transition-colors">
                      LinkedIn ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
