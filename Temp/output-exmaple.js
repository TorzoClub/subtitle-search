const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

function callFFProbe(video_path) {
  const ffprobe_cmd = `ffprobe -v error -select_streams s -show_entries stream=index,codec_name -of json "${video_path}"`
  try {
    return JSON.parse(String(execSync(ffprobe_cmd)))
  } catch (err) {
    throw new Error(`callFFProbe(${video_path}) failure`, { cause: err })
  }
}

function isSupportedSubtitle(codec_name) {
  return ['subrip', 'ass'].includes(codec_name)
}

// 之所以这样写，是因为有些字幕是 name.TC.ass、name.SC.ass 这样的形式
// TC/SC 应该过滤掉
function getSubtitleFilename(sub_path) {
  const { base } = path.parse(sub_path)
  if (base.length === 0) {
    throw new Error('require non-empty sub_path string')
  } else {
    return base.split('.')[0]
  }
}
function compareIgnoreCase(str_a, str_b) {
  return str_a.toLowerCase() === str_b.toLowerCase()
}
// 查找外挂字幕
// 逻辑：
//   同个目录内，与视频同名的文件
//   位于 sub、subs、subtitles 目录中的同名文件
//   还要尝试能不能正常读取
function findExternalSubtitlesSync(video_path) {
  const { dir, name: video_filename } = path.parse(video_path)
  const possible_dirs = [dir, path.join(dir, 'sub'), path.join(dir, 'subs'), path.join(dir, 'subtitles')]
  const subtitles = []

  for (const sub_dir of possible_dirs) {
    if (fs.existsSync(sub_dir)) {
      for (const sub_file of fs.readdirSync(sub_dir)) {
        const sub_path = path.join(sub_dir, sub_file)
        const sub_ext = path.parse(sub_file).ext
        const is_sub_suffix = compareIgnoreCase('.ass', sub_ext) || compareIgnoreCase('.srt', sub_ext)
        if (
          is_sub_suffix
          && compareIgnoreCase(video_filename, getSubtitleFilename(sub_path))
          && !fs.statSync(sub_path).isDirectory()
        ) {
          const ass_raw = String( fs.readFileSync(sub_path) )
          const common = {
            type: 'external',
            subtitle_path: sub_path,
            stream_index: -1,
            ass_raw,
          }
          if (compareIgnoreCase('.ass', path.parse(sub_file).ext)) {
            // xxx： 应该使用 ass-compiler 尝试读取的，先这样了。
            subtitles.push({ ...common, codec_name: 'ass' })
          } else {
            // xxx： 应该将 srt 转码为 ass 的，先这样了。
            subtitles.push({ ...common, codec_name: 'srt' })
          }
        }
      }
    }
  }

  return subtitles
}

function readSubtitleSync(video_path) {
  const ffprobe_out = callFFProbe(video_path)

  const external_subtitles = findExternalSubtitlesSync(video_path)

  if (!Array.isArray(ffprobe_out.streams) || (ffprobe_out.streams.length === 0)) {
    // 未找到字幕
    return external_subtitles
  } else {
    return [
      /* 内封字幕 */ ...ffprobe_out.streams.map((stream, index) => {
        try {
          const command = `ffmpeg -v error -i "${video_path}" -map 0:s:${index} -c:s ass -f ass -`
          return {
            type: 'internal',
            stream_index: stream.index,
            codec_name: stream.codec_name,
            ass_raw: isSupportedSubtitle(stream.codec_name) ? execSync(command).toString() : null
          }
        } catch (err) {
          throw new Error(`readSubtitleSync(${video_path}) failure`, { cause: err })
        }
      }),
      /* 外挂字幕 */ ...external_subtitles
    ]
  }
}

const __SUPPORTED_VIDEO_SUFFIX__ = ['.mp4', '.mkv', '.avi', '.mov']
function isVideoSuffix(video_path) {
  const ext = path.extname(video_path).toLowerCase()
  return __SUPPORTED_VIDEO_SUFFIX__.includes(ext)
}

function scanVideoSync(dir_path) {
  const files = fs.readdirSync(dir_path)

  const video_files = []

  files.forEach(file => {
    const file_path = path.join(dir_path, file)
    const stat = fs.statSync(file_path)
    if (stat.isDirectory()) {
      video_files.push( ...scanVideoSync(file_path) )
    } else {
      if (isVideoSuffix(file_path)) {
        video_files.push( file_path )
      }
    }
  })

  return video_files
}

const video_files = scanVideoSync('/Volumes/10.0.0.7/temp/')
// const video_files = scanVideoSync('./video_res')
video_files.forEach(video_file => {
  // console.log(`读取：${video_file}`)
  const subtitles = readSubtitleSync(video_file)
  process.stdout.write(`读取 ${video_file} `)

  const sub_info = subtitles.map((sub) => {
    return `${sub.stream_index}-${sub.codec_name}`
  }).join('、')

  process.stdout.write(`-> 字幕：${
    sub_info.length ? sub_info : '无'
  }`)
  process.stdout.write(`\n`)
})
