const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
//筛选文件后缀
function isSupportedFiles(videoPath){
    const ext = path.extname(videoPath).toLowerCase();
    return ['.mp4', '.mkv', '.mov', '.avi'].includes(ext);
}
//扫描目录
function scanVideo(videoFolder) {
    const files = fs.readdirSync(videoFolder);
    const videoFiles = [];

    files.forEach( file => {
        const videoPath = path.join(videoFolder, file);
        const stat = fs.statSync(videoPath);

        if(stat.isDirectory()) {
            videoFiles.push(...scanVideo(videoPath));
        } else {
            if (isSupportedFiles(videoPath)) {
                videoFiles.push(videoPath)
            }
        }
    })
    return videoFiles
}
//判断是否兼容字体格式
function isSupportedSubtitle(codec_name) {
    return ['subrip', 'ass'].includes(codec_name);
}
//查看视频信息
function callFFprobe(inputFilePath) {
    const ffprobe_cmd = `ffprobe -v error -select_streams s -show_entries stream=index,codec_name -of json "${inputFilePath}"`;
    try {
        return JSON.parse(execSync(ffprobe_cmd).toString());
    } catch(err) {
        throw new Error(`callFFprobe ${inputFilePath} failure`, { cause:err });
    }
}
//开始读取视频内嵌字幕
function readSubtitleSync(inputFilePath) {
    const ffprobeOut = callFFprobe(inputFilePath);
    if(!ffprobeOut.streams || ffprobeOut.streams.lenght === 0) {
        console.log(`视频未找到字幕`); 
    } else {
        return [
            ...ffprobeOut.streams.map((stream,index) => {
                try {
                    const command = `ffmpeg -v error -i "${inputFilePath}" -map 0:s:${index} -c:s ass -f ass -`;
                    return {
                        stream_index: stream.index,
                        codec_name: stream.codec_name,
                        ass_raw: isSupportedSubtitle(stream.codec_name) ? execSync(command).toString() : null
                    }
                } catch(err) {
                    throw new Error(`readSubtitleSync${inputFilePath}failure`, { cause: err})
                }
            })
        ]
    }
}
