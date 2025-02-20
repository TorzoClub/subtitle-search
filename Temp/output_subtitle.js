const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { exec } = require('child_process');
const videoFolder = './video_res';  //获取视频目录

//检测文件信息
try {
    const files = fs.readdirSync(videoFolder);
    const videoFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.mp4', '.mkv', 'avi', '.mov'].includes(ext);
    })

    videoFiles.forEach(videoFile => {
            const inputFilePath = path.join(videoFolder,videoFile);
            const probeCommand = `ffprobe -v error -select_streams s -show_entries stream=index,codec_name -of json "${inputFilePath}"`;
            const probeOut = JSON.parse(execSync(probeCommand).toString());
            //获取字幕详细
    
            if (!probeOut.streams || probeOut.streams.length === 0) {
                    console.log(`视频${videoFile}未找到字幕`);
            }   //确认是否存在字幕
    
            probeOut.streams.forEach((stream,index) => {
                const outputFilePath = `./output/${videoFile}${index}.${stream.codec_name === 'subrip' ? 'srt' : 'ass'}`;
                //定义输出路径名称及字幕格式后缀
                
                const command = `ffmpeg -v error -i "${inputFilePath}" -map 0:s:${index} -c:s ${stream.codec_name} -y "${outputFilePath}" -f ass -`;
                //执行ffmpeg将字幕分离
                try {
                    const output = execSync(command).toString();
                    console.log(`字幕已导出：${outputFilePath}，\n字幕内容：\n`,output,'字幕输出已完成');
                } catch (err) {
                    console.error("输出错误:",err)
                }
            });
        });
    } catch (error) {
      console.error("路径读取错误：",error);
    }