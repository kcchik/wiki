# Free Anime Forever
https://github.com/kcchik/koji

All anime streaming services are either paid, or full of ads. I wanted to create a platform where users could watch uninterrupted and high quality anime for free. However, I couldn't afford to buy a server and upload every anime, which left me with the option of creating a serverless platform.

Torrenting was the solution I came up with. This would allow it to be free, no content would need to be uploaded by me, and it would be less illegal than having a server full of pirated anime. Speed shouldn't be too much of a problem since I could connect to peers using any torrent client (µTorrent, BitTorrent...), as long as it's not some no name anime that nobody is seeding.

## Finding torrents
The first step on this questionable journey was to find a source for torrents. I ended up using the BitTorrent site nyaa.si. It provided torrents for pretty much any anime, manga, or light novel. The best thing about it was that it provided a RSS feed for search results. This meant that I could search or filter for torrents, and it would return an easily parsable list of results.

## Creating the BitTorrent client
I decided to create my own BitTorrent client for this project, to maximize configurability and minimize dependencies. To start off, I found this [guide](http://www.kristenwidman.com/blog/33/how-to-write-a-bittorrent-client-part-1/) by Kristen Widman very helpful. To sum it up:
- Files are separated into pieces, and pieces are separated into blocks
- Peers will have certain pieces available
- The client can request the piece in blocks

Learning the BitTorrent protocol was probably one of the most enjoyable parts of this project. There were a lot of aspects that were not documented clearly, and I had to figure out through trial and error. Also, what interested me was that the protocol was merely a suggestion. There is no server, therefore peers don't __have__ to follow the protocol. If a client with a lot of users like µTorrent decided to create their own protocol, it would work, and probably screw over all other torrent clients.

After completing the tutorial, I had a client that could connect to peers and request pieces synchronously. I could successfully download small text files, but this was obviously not enough to stream an entire episode of anime.

### Multi-threading requests
I needed to connect to multiple peers and request pieces at the simultaneously. I had each connection in a separate thread, requesting pieces and writing to a single file. This made things a bit complicated, so I ended up spending a lot of time refactoring and fixing race conditions.

Although I could now download anime with varying levels of success, it still seemed very slow and unreliable. After making the client super verbose, I realized the problem was that connections were either being rejected, timing out or cut off. This was pretty hard to debug, since other torrents couldn't send error messages. I knew that connections were failing, and not the reason. I am still trying to figure this out lol.

### Piece management and algorithms
One important aspect about torrenting is the optimal order of requesting pieces. By far the most popular is rarest piece first, which consists of requesting pieces that are available in the least number of peers first. I wanted to stream videos, so I would need to request the first piece first. But what if a request for a block fails? My had multiple solutions for that:
1. Add a bit of redundancy - have multiple requests for the same block
1. Ignore the block
1. Request from a different peer the moment it fails

Currently, I am using option 3, since the connections will always be requesting a unique block. I should probably switch to option 1 or 2, because they would reduce buffering more.

### Magnet links
With torrent files, the client would need to download a file from nyaa.si, and then connect to all the peers. Magnet links eliminate the need to download a torrent file first. However, the metadata in a torrent file would need to be retrieved through peer to peer connections. I had this part working, but after refactoring a bunch of threading stuff to fix race conditions, I decided to remove it for now.

## Resources
[Kristen Widman's blog](http://www.kristenwidman.com/blog/33/how-to-write-a-bittorrent-client-part-1/)

[BitTorrent.org](http://www.bittorrent.org/beps/bep_0000.html)

[Peer-to-peer networking with BitTorrent](http://web.cs.ucla.edu/classes/cs217/05BitTorrent.pdf)
