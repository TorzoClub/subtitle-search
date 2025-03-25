import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { parse, stringify, compile, decompile } from 'ass-compiler';
/*
videoFolder为目录路径
videoPath为完整路径（包括文件名）
*/

    function processVideoFolder(videoFolder) {
        //筛选文件后缀
        function isSupportedFiles(videoPath){
            const ext = path.extname(videoPath).toLowerCase();
            return ['.mp4', '.mkv', '.mov', '.avi'].includes(ext);
        }

        //判断是否兼容字体格式
        function isSupportedSubtitle(codec_name) {
            return ['subrip', 'ass'].includes(codec_name);
        }

        //扫描目录
        function scanVideoSync(videoFolder) {
            const files = fs.readdirSync(videoFolder);
            const videoFiles = [];

            files.forEach( file => {
                const videoPath = path.join(videoFolder, file);
                const stat = fs.statSync(videoPath);

                if(stat.isDirectory()) {
                    videoFiles.push(...scanVideoSync(videoPath));
                } else {
                    if (isSupportedFiles(videoPath)) {
                        videoFiles.push(videoPath)
                    }
                }
            })
            return videoFiles
        }

        //查看视频信息
        function callFFprobe(videoPath) {
            const ffprobe_cmd = `ffprobe -v error -select_streams s -show_entries stream=index,codec_name -of json "${videoPath}"`;
            try {
                return JSON.parse(execSync(ffprobe_cmd).toString());
            } catch(err) {
                throw new Error(`callFFprobe ${videoPath} failure`, { cause:err });
            }
        }
        //开始读取视频内嵌字幕
        function readSubtitleSync(videoPath) {
            const ffprobeOut = callFFprobe(videoPath);
            if(!ffprobeOut.streams || ffprobeOut.streams.length === 0) {
                return [];
            } else {
                return [
                    ...ffprobeOut.streams.map((stream,index) => {
                        try {
                            const command = `ffmpeg -v error -i "${videoPath}" -map 0:s:${index} -c:s ass -f ass -`;
                            const options = {};
                            const commandToStr = execSync(command).toString();
                            const compilationASS = parse(commandToStr,options)
                            return {
                                stream_index: stream.index,
                                codec_name: stream.codec_name,
                                ass_raw: isSupportedSubtitle(stream.codec_name) ? compilationASS : null
                            }
                        } catch(err) {
                            throw new Error(`readSubtitleSync${videoPath}failure`, { cause: err})
                        }
                    })
                ]
            }
        }

        const videoFiles = scanVideoSync(videoFolder)

        return videoFiles.map(videoFile => {
            const subtitles = readSubtitleSync(videoFile);
            return {
                videoPath: videoFile,
                subtitles: subtitles.map(sub => 
                        (
                            {
                            stream_index: sub.stream_index,
                            codec_name: sub.codec_name, 
                            ass_raw: sub.ass_raw
                            }
                        ))
            }
        })
    }
    
const target = processVideoFolder('./video_res');
target.forEach(video => {
    process.stdout.write(`读取文件:${video.videoPath}`);
    const sub = JSON.stringify(video.subtitles.ass_raw)
    const sub_info = video.subtitles.map((sub) => {
        return `${sub.stream_index} - ${sub.codec_name} - ${JSON.stringify(sub.ass_raw)}`
    }).join('、');

    process.stdout.write('\n');

    process.stdout.write(`${
        video.subtitles.length ? '字幕：' + sub_info : '无字幕'
    }`)
    process.stdout.write('\n');
})
