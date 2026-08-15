using Backend.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Track> Tracks { get; set; }
    public DbSet<Album> Albums { get; set; }
    public DbSet<TrackAlbum> TrackAlbums { get; set; }
    public DbSet<TeamMember> TeamMembers { get; set; }
    public DbSet<Comment> Comments { get; set; }
    public DbSet<AlbumComment> AlbumComments { get; set; }
    public DbSet<Follow> Follows { get; set; }
    public DbSet<Event> Events { get; set; }
    public DbSet<EventRequest> EventRequests { get; set; }
    public DbSet<EventTrack> EventTracks { get; set; }
    public DbSet<EventComment> EventComments { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Event>().ToTable("Events");
        modelBuilder.Entity<EventRequest>().ToTable("EventRequests");
        modelBuilder.Entity<EventTrack>().ToTable("EventTracks");
        modelBuilder.Entity<EventComment>().ToTable("EventComments");

        modelBuilder.Entity<TrackAlbum>()
            .HasKey(ta => new { ta.TrackId, ta.AlbumId });

        modelBuilder.Entity<TrackAlbum>()
            .HasOne(ta => ta.Track)
            .WithMany(t => t.TrackAlbums)
            .HasForeignKey(ta => ta.TrackId);

        modelBuilder.Entity<TrackAlbum>()
            .HasOne(ta => ta.Album)
            .WithMany(a => a.TrackAlbums)
            .HasForeignKey(ta => ta.AlbumId);

        modelBuilder.Entity<Follow>()
            .HasKey(f => new { f.FollowerId, f.FolloweeId });

        // Indexes for common query patterns
        modelBuilder.Entity<Event>()
            .HasIndex(e => e.Status);
        modelBuilder.Entity<Event>()
            .HasIndex(e => e.ScheduledAt);
        modelBuilder.Entity<Event>()
            .HasIndex(e => new { e.Status, e.ScheduledAt });

        modelBuilder.Entity<EventTrack>()
            .HasIndex(et => et.EventId);
        modelBuilder.Entity<EventTrack>()
            .HasIndex(et => new { et.EventId, et.Status });

        modelBuilder.Entity<EventComment>()
            .HasIndex(ec => new { ec.EventId, ec.EventTrackId });

        modelBuilder.Entity<Album>()
            .HasIndex(a => a.ArtistId);

        modelBuilder.Entity<Track>()
            .HasIndex(t => t.IsPublished);
        modelBuilder.Entity<Track>()
            .HasIndex(t => new { t.IsPublished, t.PublishedAt });
    }
}
