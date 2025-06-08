from yt_dlp import YoutubeDL

def get_youtube_stream_url(youtube_url):
    ydl_opts = {
        'format': 'best[ext=mp4][vcodec^=avc1]/best',
        'quiet': True,
        'noplaylist': True,
        'no_warnings': True,
        'skip_download': True
    }
    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(youtube_url, download=False)
        return info['url']
