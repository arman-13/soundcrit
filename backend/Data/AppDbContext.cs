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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

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
    }
}
