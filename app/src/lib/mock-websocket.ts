export class MockWebSocket extends EventTarget {
  private url: string
  private _readyState: number = 0

  constructor(url: string) {
    super()
    this.url = url
    
    // Simulate connection
    setTimeout(() => {
      this._readyState = 1
      this.dispatchEvent(new Event('open'))
      
      // Simulate progress updates
      this.simulateProgress()
    }, 100)
  }

  get readyState() {
    return this._readyState
  }

  close() {
    this._readyState = 3
    this.dispatchEvent(new Event('close'))
  }

  private simulateProgress() {
    const steps = [10, 25, 45, 60, 75, 90, 100]
    let i = 0

    const interval = setInterval(() => {
      if (i >= steps.length || this._readyState !== 1) {
        clearInterval(interval)
        return
      }

      this.dispatchEvent(new MessageEvent('message', {
        data: JSON.stringify({
          status: 'progress',
          progress: steps[i]
        })
      }))

      i++
    }, 1000)
  }
} 