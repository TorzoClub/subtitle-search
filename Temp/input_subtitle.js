const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const videoFolder = './video_res';  //获取视频目录
const subtitleFolder = './subtitle_res'; //获取字幕目录
const outputFolder = './output' //导出文件目录

fs.readdir(videoFolder, (err, videoFiles) => {
    //使用fs.readdir获取文件夹内文件
    if(err){
        console.error('无法读取文件夹：',err);
        return;
    }

    videoFiles.forEach(videoFile => {
        const videoName = path.basename(videoFile, path.extname(videoFile));
        //获取文件名
        const videoPath = path.join(videoFolder, videoFile);
        //获取文件路径
        const subtitlePath = path.join(subtitleFolder, `${videoName}.ass`);
        //字幕路径
        const outputPath = path.join(outputFolder, `${videoName}.mkv`)

        const command = `ffmpeg -i "${videoPath}" -i "${subtitlePath}" -c:v copy -c:a copy -c:s copy "${outputPath}"`;

        exec(command, (err,stdout,stderr) => {
            if(err) {
                console.error(`处理文件${videoFile}时出错：`,err);
                return
            }
            console.log(`合并成功"${outputPath}`)
    
        })
    });
});